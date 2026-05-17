const TARGET_COLUMNS = new Map([
  ["username", "uniq_users_username"],
  ["email", "uniq_users_email"],
  ["phone", "uniq_users_phone"],
]);

const normalizeColumnList = (index) =>
  (index.fields || [])
    .map((field) => (typeof field === "string" ? field : field?.attribute || field?.name))
    .filter(Boolean)
    .join(",");

const getIndexes = async (qi, tableName) => {
  try {
    return await qi.showIndex(tableName);
  } catch {
    return [];
  }
};

const removeIndexIfExists = async (qi, tableName, indexName) => {
  try {
    await qi.removeIndex(tableName, indexName);
  } catch {
    // Index may already be absent on fresh databases.
  }
};

const addUniqueIndexIfMissing = async (qi, tableName, columnName, indexName, indexes) => {
  const exists = indexes.some((index) => index.name === indexName);
  if (exists) return;
  await qi.addIndex(tableName, [columnName], { name: indexName, unique: true });
};

export const up = async ({ context: qi }) => {
  const tableName = "users";
  const indexes = await getIndexes(qi, tableName);
  if (indexes.length === 0) return;

  for (const [columnName, targetName] of TARGET_COLUMNS) {
    const duplicates = indexes.filter((index) => {
      if (index.primary) return false;
      return normalizeColumnList(index) === columnName;
    });

    const keep =
      duplicates.find((index) => index.name === targetName) ||
      duplicates.find((index) => !index.unique) ||
      duplicates[0];

    for (const index of duplicates) {
      if (keep && index.name === keep.name) continue;
      await removeIndexIfExists(qi, tableName, index.name);
    }
  }

  const refreshed = await getIndexes(qi, tableName);
  for (const [columnName, targetName] of TARGET_COLUMNS) {
    await addUniqueIndexIfMissing(qi, tableName, columnName, targetName, refreshed);
  }
};

export const down = async () => {
  // Intentionally empty. Re-creating duplicate indexes is not useful.
};
