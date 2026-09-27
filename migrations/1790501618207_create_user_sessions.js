export const up = (pgm) => {
  pgm.createTable('user_sessions', {
    sid: { type: 'varchar', notNull: true, primaryKey: true },
    sess: { type: 'json', notNull: true },
    expire: { type: 'timestamp(6)', notNull: true },
  });

  pgm.createIndex('user_sessions', 'expire', { name: 'IDX_user_sessions_expire' });
};

export const down = (pgm) => {
  pgm.dropTable('user_sessions');
};