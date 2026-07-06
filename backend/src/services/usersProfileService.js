const { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const config = require('../config');
const { slugUserId } = require('./dynamoUtils');

const dynamo = new DynamoDBClient({ region: config.dynamo.region });
const TABLE = config.dynamo.usersTable;

function pk(userIdOrName) {
  const slug = userIdOrName.includes('USER#') ? userIdOrName.replace('USER#', '') : slugUserId(userIdOrName);
  return `USER#${slug}`;
}

async function getProfile(userIdOrName) {
  const res = await dynamo.send(new GetItemCommand({
    TableName: TABLE,
    Key: marshall({ PK: pk(userIdOrName), SK: 'PERFIL' }),
  }));
  return res.Item ? unmarshall(res.Item) : null;
}

async function upsertProfile({ userId, userName, userType }) {
  const slug = slugUserId(userName || userId);
  const item = {
    PK: `USER#${slug}`,
    SK: 'PERFIL',
    userId: String(userId).toLowerCase(),
    userName: userName || userId,
    userType: userType || 'ecodelivery',
    calendarioPropuestaHabilitada: false,
    updatedEn: Date.now(),
  };
  await dynamo.send(new PutItemCommand({
    TableName: TABLE,
    Item: marshall(item, { removeUndefinedValues: true }),
  }));
  return item;
}

async function setCalendarioPropuestaHabilitada(userIdOrName, enabled, updatedPor) {
  const key = { PK: pk(userIdOrName), SK: 'PERFIL' };
  const existing = await getProfile(userIdOrName);
  if (!existing) {
    await upsertProfile({ userId: userIdOrName, userName: userIdOrName, userType: 'ecodelivery' });
  }
  await dynamo.send(new UpdateItemCommand({
    TableName: TABLE,
    Key: marshall(key),
    UpdateExpression: 'SET calendarioPropuestaHabilitada = :e, updatedPor = :p, updatedEn = :t',
    ExpressionAttributeValues: marshall({
      ':e': Boolean(enabled),
      ':p': updatedPor || '',
      ':t': Date.now(),
    }),
  }));
  return getProfile(userIdOrName);
}

module.exports = {
  getProfile,
  upsertProfile,
  setCalendarioPropuestaHabilitada,
};
