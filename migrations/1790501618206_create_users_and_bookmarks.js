export const up = (pgm) => {
  pgm.createTable('users', {
    id: 'id',
    email: { type: 'text', notNull: true },
    password_hash: { type: 'text', notNull: true },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.sql('CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email))');

  pgm.createTable('bookmarks', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    recipe_id: { type: 'text', notNull: true },
    recipe_data: { type: 'jsonb', notNull: true },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.addConstraint('bookmarks', 'bookmarks_user_recipe_unique', {
    unique: ['user_id', 'recipe_id'],
  });
};

export const down = (pgm) => {
  pgm.dropTable('bookmarks');
  pgm.dropTable('users');
};