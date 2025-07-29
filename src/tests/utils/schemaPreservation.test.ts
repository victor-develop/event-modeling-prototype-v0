import {
  parseSchema,
  printSchema,
  findTypeNames,
  updateTypeNames,
  renameTypePreservingFields,
  renameTypeWithStringReplacement,
  renameTypeWithFallbacks,
  updateSchemaTypeNames
} from '../../utils/schemaPreservation';
import { TypeNameUpdate } from '../../types/schema';

describe('Schema Preservation Utilities', () => {
  // Sample schema for testing
  const sampleSchema = `
    type User {
      id: ID!
      name: String!
      email: String
      posts: [Post!]
    }

    type Post {
      id: ID!
      title: String!
      content: String
      author: User!
    }

    input CreateUserInput {
      name: String!
      email: String!
    }

    type Query {
      user(id: ID!): User
      allUsers: [User!]!
      post(id: ID!): Post
    }

    type Mutation {
      createUser(input: CreateUserInput!): User!
      updateUser(id: ID!, input: CreateUserInput!): User!
    }
  `;

  describe('parseSchema', () => {
    it('should parse a valid schema', () => {
      const ast = parseSchema(sampleSchema);
      expect(ast).not.toBeNull();
    });

    it('should return null for invalid schema', () => {
      const invalidSchema = 'type User { invalid syntax';
      const ast = parseSchema(invalidSchema);
      expect(ast).toBeNull();
    });
  });

  describe('printSchema', () => {
    it('should print a schema AST back to string', () => {
      const ast = parseSchema(sampleSchema);
      if (!ast) throw new Error('Failed to parse schema for test');
      
      const printed = printSchema(ast);
      expect(printed).toContain('type User');
      expect(printed).toContain('type Post');
    });
  });

  describe('findTypeNames', () => {
    it('should find all type names in a schema', () => {
      const ast = parseSchema(sampleSchema);
      if (!ast) throw new Error('Failed to parse schema for test');
      
      const typeNames = findTypeNames(ast);
      expect(typeNames).toContain('User');
      expect(typeNames).toContain('Post');
      expect(typeNames).toContain('CreateUserInput');
      expect(typeNames).toContain('Query');
      expect(typeNames).toContain('Mutation');
    });
  });

  describe('updateTypeNames', () => {
    it('should update type names in the AST', () => {
      const ast = parseSchema(sampleSchema);
      if (!ast) throw new Error('Failed to parse schema for test');
      
      const updates: TypeNameUpdate[] = [
        { oldName: 'User', newName: 'Customer', blockType: 'view' },
        { oldName: 'Post', newName: 'Article', blockType: 'view' }
      ];
      
      const updatedAst = updateTypeNames(ast, updates);
      const updatedSchema = printSchema(updatedAst);
      
      // Check type definitions were renamed
      expect(updatedSchema).toContain('type Customer');
      expect(updatedSchema).toContain('type Article');
      expect(updatedSchema).not.toContain('type User');
      expect(updatedSchema).not.toContain('type Post');
      
      // Check references were updated
      expect(updatedSchema).toContain('author: Customer!');
      expect(updatedSchema).toContain('posts: [Article!]');
      expect(updatedSchema).toContain('allUsers: [Customer!]!');
    });

    it('should handle empty updates array', () => {
      const ast = parseSchema(sampleSchema);
      if (!ast) throw new Error('Failed to parse schema for test');
      
      const updatedAst = updateTypeNames(ast, []);
      expect(updatedAst).toBe(ast); // Should return the same AST
    });
  });

  describe('renameTypePreservingFields', () => {
    it('should rename a type while preserving fields', () => {
      const result = renameTypePreservingFields(sampleSchema, 'User', 'Customer');
      
      expect(result.success).toBe(true);
      expect(result.schema).toContain('type Customer');
      expect(result.schema).not.toContain('type User {');
      expect(result.schema).toContain('author: Customer!');
      expect(result.schema).toContain('allUsers: [Customer!]!');
    });

    it('should handle errors gracefully', () => {
      const invalidSchema = 'type User { invalid syntax';
      const result = renameTypePreservingFields(invalidSchema, 'User', 'Customer');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.schema).toBe(invalidSchema); // Should return original on error
    });
  });

  describe('renameTypeWithStringReplacement', () => {
    it('should rename types using string replacement', () => {
      const result = renameTypeWithStringReplacement(sampleSchema, 'User', 'Customer');
      
      expect(result).toContain('type Customer');
      expect(result).not.toContain('type User');
      expect(result).toContain('author: Customer!');
    });

    it('should only replace whole words', () => {
      const schema = 'type User { id: ID! } type UserProfile { userId: ID! }';
      const result = renameTypeWithStringReplacement(schema, 'User', 'Customer');
      
      expect(result).toContain('type Customer {');
      expect(result).toContain('type UserProfile'); // Should not replace partial matches
    });
  });

  describe('renameTypeWithFallbacks', () => {
    it('should use AST-based renaming when possible', () => {
      const result = renameTypeWithFallbacks(sampleSchema, 'User', 'Customer');
      
      expect(result.success).toBe(true);
      expect(result.schema).toContain('type Customer');
      expect(result.schema).not.toContain('type User {');
    });

    it('should fall back to string replacement when AST parsing fails', () => {
      // Mock a failure in AST parsing
      const invalidSchema = 'type User { id: ID! } # with an intentional parsing error: @@';
      const result = renameTypeWithFallbacks(invalidSchema, 'User', 'Customer');
      
      expect(result.success).toBe(true); // Should succeed with fallback
      expect(result.schema).toContain('type Customer');
    });
  });

  describe('updateSchemaTypeNames', () => {
    it('should update multiple type names at once', () => {
      const updates: TypeNameUpdate[] = [
        { oldName: 'User', newName: 'Customer', blockType: 'view' },
        { oldName: 'Post', newName: 'Article', blockType: 'view' }
      ];
      
      const result = updateSchemaTypeNames(sampleSchema, updates);
      
      expect(result.success).toBe(true);
      expect(result.schema).toContain('type Customer');
      expect(result.schema).toContain('type Article');
      expect(result.schema).not.toContain('type User {');
      expect(result.schema).not.toContain('type Post {');
      expect(result.schema).toContain('author: Customer!');
      expect(result.schema).toContain('posts: [Article!]');
    });

    it('should handle empty updates array', () => {
      const result = updateSchemaTypeNames(sampleSchema, []);
      
      expect(result.success).toBe(true);
      expect(result.schema).toBe(sampleSchema);
    });
  });
});
