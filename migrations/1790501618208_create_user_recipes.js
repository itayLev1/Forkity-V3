export const up = (pgm) => {
  pgm.createTable('user_recipes', {
    recipe_id: { type: 'text', primaryKey: true },
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    recipe_data: { type: 'jsonb', notNull: true },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('user_recipes', ['user_id', 'created_at']);
};

export const down = (pgm) => {
  pgm.dropTable('user_recipes');
};