const {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  DeleteItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const config = require('../config');
const { listAllCognitoUsers } = require('./cognitoUsersService');

const dynamo = new DynamoDBClient({ region: config.dynamo.region });

const CURRENT_TUTORIAL_VERSION = 5;

function userPk(userId) {
  return `USER#${String(userId).trim().toLowerCase()}`;
}

function rolToUserType(rol) {
  const r = String(rol || '').trim();
  if (r === 'Bee Zero') return 'beezero';
  if (r === 'Operador') return 'operador';
  if (r === 'Ecodelivery') return 'ecodelivery';
  return null;
}

async function getOnboardingRecord(userId) {
  const res = await dynamo.send(
    new GetItemCommand({
      TableName: config.dynamo.onboardingTable,
      Key: marshall({ PK: userPk(userId) }),
    })
  );
  return res.Item ? unmarshall(res.Item) : null;
}

async function getOnboardingStatus(userId) {
  const record = await getOnboardingRecord(userId);
  const completed =
    Boolean(record) &&
    Number(record.tutorialVersion || 0) >= CURRENT_TUTORIAL_VERSION;

  return {
    completed,
    tutorialVersion: record?.tutorialVersion ?? null,
    completedAt: record?.completedAt ?? null,
    currentVersion: CURRENT_TUTORIAL_VERSION,
  };
}

async function completeOnboarding(userId, userType) {
  const completedAt = Date.now();
  const item = {
    PK: userPk(userId),
    userId: String(userId).trim().toLowerCase(),
    tutorialVersion: CURRENT_TUTORIAL_VERSION,
    completedAt,
    userType: userType || 'beezero',
  };

  await dynamo.send(
    new PutItemCommand({
      TableName: config.dynamo.onboardingTable,
      Item: marshall(item, { removeUndefinedValues: true }),
    })
  );

  return item;
}

async function scanAllOnboardingRecords() {
  const items = [];
  let lastKey;
  do {
    const res = await dynamo.send(
      new ScanCommand({
        TableName: config.dynamo.onboardingTable,
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      })
    );
    (res.Items || []).forEach((i) => items.push(unmarshall(i)));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function listOnboardingWithUsers() {
  const [users, records] = await Promise.all([
    listAllCognitoUsers(),
    scanAllOnboardingRecords(),
  ]);

  const recordByUser = new Map(
    records.map((r) => [String(r.userId || '').toLowerCase(), r])
  );

  return users
    .filter((u) => rolToUserType(u.rol))
    .map((u) => {
      const record = recordByUser.get(u.usuario.toLowerCase());
      const completed =
        Boolean(record) &&
        Number(record.tutorialVersion || 0) >= CURRENT_TUTORIAL_VERSION;
      return {
        usuario: u.usuario,
        nombre: u.nombre,
        rol: u.rol,
        userType: rolToUserType(u.rol),
        onboarding: record
          ? {
              completed,
              tutorialVersion: record.tutorialVersion,
              completedAt: record.completedAt,
            }
          : null,
      };
    });
}

async function resetOnboarding(userId) {
  await dynamo.send(
    new DeleteItemCommand({
      TableName: config.dynamo.onboardingTable,
      Key: marshall({ PK: userPk(userId) }),
    })
  );
}

async function resetAllOnboarding(userTypeFilter) {
  const records = await scanAllOnboardingRecords();
  const toDelete = userTypeFilter
    ? records.filter((r) => r.userType === userTypeFilter)
    : records;

  for (const record of toDelete) {
    await dynamo.send(
      new DeleteItemCommand({
        TableName: config.dynamo.onboardingTable,
        Key: marshall({ PK: record.PK }),
      })
    );
  }

  return { deleted: toDelete.length };
}

module.exports = {
  CURRENT_TUTORIAL_VERSION,
  getOnboardingStatus,
  completeOnboarding,
  listOnboardingWithUsers,
  resetOnboarding,
  resetAllOnboarding,
  rolToUserType,
};
