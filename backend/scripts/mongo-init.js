// MongoDB initialization script
db = db.getSiblingDB('policy-project');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'firstName', 'lastName', 'password'],
      properties: {
        email: {
          bsonType: 'string',
          description: 'Email must be a string and is required'
        },
        firstName: {
          bsonType: 'string',
          description: 'First name must be a string and is required'
        },
        lastName: {
          bsonType: 'string',
          description: 'Last name must be a string and is required'
        },
        password: {
          bsonType: 'string',
          description: 'Password must be a string and is required'
        },
        role: {
          bsonType: 'string',
          enum: ['user', 'admin'],
          description: 'Role must be either user or admin'
        },
        isActive: {
          bsonType: 'bool',
          description: 'isActive must be a boolean'
        }
      }
    }
  }
});

db.createCollection('policies', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title', 'description', 'content', 'createdBy'],
      properties: {
        title: {
          bsonType: 'string',
          description: 'Title must be a string and is required'
        },
        description: {
          bsonType: 'string',
          description: 'Description must be a string and is required'
        },
        content: {
          bsonType: 'string',
          description: 'Content must be a string and is required'
        },
        status: {
          bsonType: 'string',
          enum: ['draft', 'published', 'archived'],
          description: 'Status must be draft, published, or archived'
        },
        tags: {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          },
          description: 'Tags must be an array of strings'
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

db.policies.createIndex({ createdBy: 1 });
db.policies.createIndex({ status: 1 });
db.policies.createIndex({ tags: 1 });
db.policies.createIndex({ title: 'text', description: 'text', content: 'text' });

print('Database initialized with collections and indexes');
