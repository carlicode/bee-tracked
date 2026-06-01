/**
 * Almacén de sesiones en DynamoDB.
 * Uso: producción Lambda, multi-instancia, escalable.
 * Persiste entre invocaciones y comparte sesiones entre instancias.
 */

const {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos

class DynamoDBSessionStore {
  constructor(options = {}) {
    this.tableName = options.tableName || process.env.SESSIONS_TABLE_NAME || 'bee-tracked-sessions';
    this.region = options.region || process.env.AWS_REGION || 'us-east-1';
    this.inactivityTimeout = options.inactivityTimeout ?? INACTIVITY_TIMEOUT_MS;
    this.client = new DynamoDBClient({ region: this.region });
  }

  async set(userId, sessionData) {
    const sessionId = this._generateId();
    const now = Date.now();
    const ttl = Math.floor(now / 1000) + this.inactivityTimeout / 1000;

    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(
          {
            userId,
            sessionId,
            createdAt: now,
            lastActivity: now,
            ttl,
            ...sessionData,
          },
          { removeUndefinedValues: true }
        ),
      })
    );

    console.log(`✅ Sesión registrada (dynamodb): ${userId} (${sessionId})`);
    return sessionId;
  }

  async get(userId) {
    const res = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({ userId }),
      })
    );

    if (!res.Item) return null;
    return unmarshall(res.Item);
  }

  async touch(userId) {
    const session = await this.get(userId);
    if (!session) return false;

    const now = Date.now();
    const ttl = Math.floor(now / 1000) + this.inactivityTimeout / 1000;

    await this.client.send(
      new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({ userId }),
        UpdateExpression: 'SET lastActivity = :now, #ttl = :ttl',
        ExpressionAttributeNames: { '#ttl': 'ttl' },
        ExpressionAttributeValues: marshall({ ':now': now, ':ttl': ttl }),
      })
    );

    return true;
  }

  async delete(userId) {
    await this.client.send(
      new DeleteItemCommand({
        TableName: this.tableName,
        Key: marshall({ userId }),
      })
    );
    console.log(`🔒 Sesión invalidada (dynamodb): ${userId}`);
    return true;
  }

  async isValid(userId, sessionId) {
    const session = await this.get(userId);
    if (!session) return false;

    if (session.sessionId !== sessionId) {
      console.log(`❌ SessionId no coincide para usuario ${userId}`);
      return false;
    }

    const inactiveMs = Date.now() - session.lastActivity;
    if (inactiveMs > this.inactivityTimeout) {
      console.log(`❌ Sesión expirada por inactividad: ${userId} (${Math.round(inactiveMs / 1000)}s)`);
      await this.delete(userId);
      return false;
    }

    return true;
  }

  async cleanExpired() {
    // DynamoDB TTL elimina automáticamente; no hay que hacer nada
    return 0;
  }

  getStats() {
    return { type: 'dynamodb', table: this.tableName };
  }

  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

module.exports = { DynamoDBSessionStore };
