const {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminListGroupsForUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminUpdateUserAttributesCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || '';
const REGION = process.env.COGNITO_REGION || process.env.AWS_REGION || 'us-east-1';

const ROL_TO_GROUP = {
  'Bee Zero': 'beezero',
  Operador: 'operador',
  Ecodelivery: 'ecodelivery',
  Admin: 'admin',
};

const GROUP_TO_ROL = {
  admin: 'Admin',
  rrhh: 'Admin',
  operador: 'Operador',
  beezero: 'Bee Zero',
  ecodelivery: 'Ecodelivery',
};

const ALL_GROUPS = ['ecodelivery', 'beezero', 'operador', 'admin', 'rrhh'];

const GROUP_PRIORITY = ['admin', 'rrhh', 'operador', 'beezero', 'ecodelivery'];

let client;

function getClient() {
  if (!client) {
    client = new CognitoIdentityProviderClient({ region: REGION });
  }
  return client;
}

function attrValue(attrs, name) {
  const a = (attrs || []).find((x) => x.Name === name);
  return a?.Value || '';
}

function rolFromGroups(groups) {
  const names = (groups || []).map((g) => g.GroupName || g);
  for (const g of GROUP_PRIORITY) {
    if (names.includes(g) && GROUP_TO_ROL[g]) return GROUP_TO_ROL[g];
  }
  return 'Ecodelivery';
}

async function listAllCognitoUsers() {
  if (!USER_POOL_ID) {
    throw new Error('COGNITO_USER_POOL_ID no configurado');
  }
  const c = getClient();
  const raw = [];
  let paginationToken;
  do {
    const out = await c.send(
      new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        PaginationToken: paginationToken,
        Limit: 60,
      })
    );
    raw.push(...(out.Users || []));
    paginationToken = out.PaginationToken;
  } while (paginationToken);

  const users = await Promise.all(
    raw.map(async (u) => {
      const groupsOut = await c.send(
        new AdminListGroupsForUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: u.Username,
        })
      );
      const nombre =
        attrValue(u.Attributes, 'name') ||
        attrValue(u.Attributes, 'given_name') ||
        u.Username;
      return {
        nombre,
        usuario: u.Username,
        rol: rolFromGroups(groupsOut.Groups),
        enabled: u.Enabled !== false,
      };
    })
  );

  users.sort((a, b) =>
    (a.nombre || a.usuario).localeCompare(b.nombre || b.usuario, 'es')
  );
  return users;
}

async function createCognitoUser({ nombre, usuario, password, rol }) {
  if (!USER_POOL_ID) {
    throw new Error('COGNITO_USER_POOL_ID no configurado');
  }
  const group = ROL_TO_GROUP[rol];
  if (!group) {
    throw new Error(`Rol inválido: ${rol}`);
  }

  const cognitoUsername = String(usuario).trim().toLowerCase();
  const nombreTrim = String(nombre).trim();
  const passwordTrim = String(password).trim();
  const c = getClient();

  try {
    await c.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: cognitoUsername,
        TemporaryPassword: `Temp${passwordTrim}!`,
        UserAttributes: [{ Name: 'name', Value: nombreTrim }],
        MessageAction: 'SUPPRESS',
      })
    );
  } catch (err) {
    if (err.name !== 'UsernameExistsException') throw err;
  }

  await c.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: cognitoUsername,
      Password: passwordTrim,
      Permanent: true,
    })
  );

  await c.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: cognitoUsername,
      UserAttributes: [{ Name: 'name', Value: nombreTrim }],
    })
  );

  for (const g of ALL_GROUPS) {
    if (g === group) continue;
    try {
      await c.send(
        new AdminRemoveUserFromGroupCommand({
          UserPoolId: USER_POOL_ID,
          Username: cognitoUsername,
          GroupName: g,
        })
      );
    } catch (_) {}
  }

  await c.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: cognitoUsername,
      GroupName: group,
    })
  );

  return {
    nombre: nombreTrim,
    usuario: cognitoUsername,
    rol,
  };
}

module.exports = {
  listAllCognitoUsers,
  createCognitoUser,
  ROL_TO_GROUP,
};
