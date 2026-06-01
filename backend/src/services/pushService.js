const webpush = require('web-push');
const {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  DeleteItemCommand,
  ScanCommand,
} = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const config = require('../config');
const logger = require('../utils/logger');

const dynamo = new DynamoDBClient({ region: config.dynamo.region });
const SUBSCRIPTION_TTL_SECONDS = 90 * 24 * 60 * 60;

let vapidCache = null;

async function loadVapidKeys() {
  if (vapidCache) return vapidCache;

  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapidCache = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject: process.env.VAPID_SUBJECT || 'mailto:admin@beezero.com',
    };
    return vapidCache;
  }

  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    try {
      const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
      const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
      const response = await client.send(new GetSecretValueCommand({ SecretId: 'bee-tracked/vapid' }));
      const parsed = JSON.parse(response.SecretString);
      vapidCache = {
        publicKey: parsed.publicKey,
        privateKey: parsed.privateKey,
        subject: process.env.VAPID_SUBJECT || parsed.subject || 'mailto:admin@beezero.com',
      };
      return vapidCache;
    } catch (err) {
      logger.warn('No se pudieron cargar claves VAPID desde Secrets Manager', { error: err.message });
      return null;
    }
  }

  return null;
}

async function getVapidKeys() {
  return loadVapidKeys();
}

async function isConfigured() {
  const keys = await loadVapidKeys();
  return Boolean(keys?.publicKey && keys?.privateKey);
}

async function ensureWebPush() {
  const keys = await loadVapidKeys();
  if (!keys?.publicKey || !keys?.privateKey) return false;
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  return true;
}

function matchesAudience(userType, audience) {
  if (audience === 'all') {
    return userType === 'beezero' || userType === 'ecodelivery' || userType === 'operador';
  }
  if (audience === 'beezero') return userType === 'beezero';
  if (audience === 'ecodelivery') {
    return userType === 'ecodelivery' || userType === 'operador';
  }
  return false;
}

function dashboardUrlForAudience(audience) {
  if (audience === 'ecodelivery') return '/ecodelivery/dashboard';
  if (audience === 'beezero') return '/beezero/dashboard';
  return '/';
}

async function saveSubscription(userId, userType, subscription) {
  const ttl = Math.floor(Date.now() / 1000) + SUBSCRIPTION_TTL_SECONDS;
  await dynamo.send(
    new PutItemCommand({
      TableName: config.dynamo.pushSubsTable,
      Item: marshall({
        PK: `USER#${userId}`,
        userId,
        userType: userType || 'unknown',
        subscription,
        ttl,
        updatedAt: Date.now(),
      }),
    })
  );
}

async function removeSubscription(userId) {
  await dynamo.send(
    new DeleteItemCommand({
      TableName: config.dynamo.pushSubsTable,
      Key: marshall({ PK: `USER#${userId}` }),
    })
  );
}

async function getAllSubscriptions() {
  const items = [];
  let lastKey;

  do {
    const res = await dynamo.send(
      new ScanCommand({
        TableName: config.dynamo.pushSubsTable,
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...(res.Items || []).map((item) => unmarshall(item)));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function sendNotification(subscription, payload) {
  if (!(await ensureWebPush())) return;
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}

async function sendToUser(userId, payload) {
  const res = await dynamo.send(
    new GetItemCommand({
      TableName: config.dynamo.pushSubsTable,
      Key: marshall({ PK: `USER#${userId}` }),
    })
  );
  if (!res.Item) return;

  const { subscription } = unmarshall(res.Item);
  try {
    await sendNotification(subscription, payload);
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      await removeSubscription(userId);
    } else {
      logger.warn('Push falló para usuario', { userId, error: err.message });
    }
  }
}

async function sendToAudience(audience, payload) {
  if (!(await isConfigured())) {
    logger.warn('Push no configurado, omitiendo envío');
    return { sent: 0, failed: 0 };
  }

  const subs = await getAllSubscriptions();
  const targets = subs.filter((sub) => matchesAudience(sub.userType, audience));

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    targets.map(async ({ userId, subscription }) => {
      try {
        await sendNotification(subscription, payload);
        sent += 1;
      } catch (err) {
        failed += 1;
        if (err.statusCode === 410 || err.statusCode === 404) {
          await removeSubscription(userId);
        } else {
          logger.warn('Push falló', { userId, error: err.message });
        }
      }
    })
  );

  return { sent, failed, total: targets.length };
}

async function notifyNewAnnouncement(announcement) {
  const { title, message, audience, priority, announcementId } = announcement;
  const url = dashboardUrlForAudience(audience);

  const payload = {
    title: title || 'Nuevo anuncio',
    body: message && message.length > 100 ? `${message.slice(0, 97)}...` : message || '',
    url,
    announcementId,
    priority: priority || 'normal',
  };

  return sendToAudience(audience, payload);
}

module.exports = {
  getVapidKeys,
  isConfigured,
  saveSubscription,
  removeSubscription,
  sendToUser,
  sendToAudience,
  notifyNewAnnouncement,
};
