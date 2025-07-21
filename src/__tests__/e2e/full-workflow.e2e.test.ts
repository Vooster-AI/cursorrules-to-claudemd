import { promises as fs } from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('E2E: Full CLI Workflow', () => {
  let testDir: string;
  const CLI_PATH = path.join(process.cwd(), 'dist', 'presentation', 'cli.js');

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `c2c-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Single Project Scenarios', () => {
    it('should convert a simple project with root .cursor directory', async () => {
      // Arrange
      const cursorDir = path.join(testDir, '.cursor');
      await fs.mkdir(cursorDir, { recursive: true });
      
      await fs.writeFile(
        path.join(cursorDir, 'global.mdc'),
        '---\nalwaysApply: true\n---\n# Global Rules\n\nAlways use TypeScript.'
      );
      
      await fs.writeFile(
        path.join(cursorDir, 'react.mdc'),
        '---\ndescription: "React component guidelines"\n---\n# React Rules\n\nUse functional components.'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toContain('Converting files to c2c-rules directory...');
      expect(stdout).toContain('✓ Created c2c-rules/global.md');
      expect(stdout).toContain('✓ Created c2c-rules/react.md');
      expect(stdout).toContain('✓ Generated');
      expect(stdout).toContain('_root.md');
      expect(stdout).toContain('✓ Updated');
      expect(stdout).toContain('CLAUDE.md');

      // Verify output files
      const globalMd = await fs.readFile(path.join(testDir, 'c2c-rules', 'global.md'), 'utf-8');
      expect(globalMd).toBe('# Global Rules\n\nAlways use TypeScript.');
      
      const reactMd = await fs.readFile(path.join(testDir, 'c2c-rules', 'react.md'), 'utf-8');
      expect(reactMd).toBe('# React Rules\n\nUse functional components.');
      
      const rootMd = await fs.readFile(path.join(testDir, 'c2c-rules', '_root.md'), 'utf-8');
      expect(rootMd).toContain('you MUST read below files and STRICTLY FOLLOW as guidelines:');
      expect(rootMd).toContain('- global: @global.md');
      expect(rootMd).toContain('read below rules if description matches with your requirement:');
      expect(rootMd).toContain('- react');
      expect(rootMd).toContain('description: React component guidelines');

      const claudeMd = await fs.readFile(path.join(testDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeMd).toContain('<c2c-rules>');
      expect(claudeMd).toContain('- @c2c-rules/_root.md');
      expect(claudeMd).toContain('</c2c-rules>');
    });

    it('should handle glob patterns correctly', async () => {
      // Arrange
      const cursorDir = path.join(testDir, '.cursor');
      await fs.mkdir(cursorDir, { recursive: true });
      
      await fs.writeFile(
        path.join(cursorDir, 'typescript.mdc'),
        '---\nglobs: "**/*.ts"\n---\n# TypeScript Rules\n\nUse strict mode.'
      );
      
      await fs.writeFile(
        path.join(cursorDir, 'tests.mdc'),
        '---\nglobs: "**/*.test.ts"\n---\n# Test Rules\n\nWrite comprehensive tests.'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toContain('Converting files to c2c-rules directory...');
      
      const rootMd = await fs.readFile(path.join(testDir, 'c2c-rules', '_root.md'), 'utf-8');
      expect(rootMd).toContain('read below rules if glob pattern matches with requirement related files:');
      expect(rootMd).toContain('- typescript');
      expect(rootMd).toContain('glob: **/*.ts');
      expect(rootMd).toContain('- tests');
      expect(rootMd).toContain('glob: **/*.test.ts');
    });
  });

  describe('Multi-Project Scenarios', () => {
    it('should handle multiple subdirectory .cursor directories', async () => {
      // Arrange
      const frontendCursor = path.join(testDir, 'frontend', '.cursor');
      const backendCursor = path.join(testDir, 'backend', '.cursor');
      
      await fs.mkdir(frontendCursor, { recursive: true });
      await fs.mkdir(backendCursor, { recursive: true });
      
      await fs.writeFile(
        path.join(frontendCursor, 'vue.mdc'),
        '---\nalwaysApply: true\n---\n# Vue Rules'
      );
      
      await fs.writeFile(
        path.join(backendCursor, 'api.mdc'),
        '---\ndescription: "API design patterns"\n---\n# API Rules'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toContain('Converting files to c2c-rules directory...');
      
      // Verify frontend output
      const frontendOutput = path.join(testDir, 'frontend', 'c2c-rules', 'vue.md');
      const frontendRoot = path.join(testDir, 'frontend', 'c2c-rules', '_root.md');
      const frontendClaude = path.join(testDir, 'frontend', 'CLAUDE.md');
      
      expect(await fs.readFile(frontendOutput, 'utf-8')).toBe('# Vue Rules');
      expect(await fs.readFile(frontendRoot, 'utf-8')).toContain('you MUST read below files');
      expect(await fs.readFile(frontendClaude, 'utf-8')).toContain('<c2c-rules>');
      
      // Verify backend output
      const backendOutput = path.join(testDir, 'backend', 'c2c-rules', 'api.md');
      const backendRoot = path.join(testDir, 'backend', 'c2c-rules', '_root.md');
      const backendClaude = path.join(testDir, 'backend', 'CLAUDE.md');
      
      expect(await fs.readFile(backendOutput, 'utf-8')).toBe('# API Rules');
      expect(await fs.readFile(backendRoot, 'utf-8')).toContain('API design patterns');
      expect(await fs.readFile(backendClaude, 'utf-8')).toContain('<c2c-rules>');
    });

    it('should handle mixed root and subdirectory .cursor directories', async () => {
      // Arrange
      const rootCursor = path.join(testDir, '.cursor');
      const appCursor = path.join(testDir, 'app', '.cursor');
      
      await fs.mkdir(rootCursor, { recursive: true });
      await fs.mkdir(appCursor, { recursive: true });
      
      await fs.writeFile(
        path.join(rootCursor, 'global.mdc'),
        '---\nalwaysApply: true\n---\n# Global Standards'
      );
      
      await fs.writeFile(
        path.join(appCursor, 'app.mdc'),
        '---\nglobs: "src/**/*.tsx"\n---\n# App Rules'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toContain('Converting files to c2c-rules directory...');
      
      // Root output should exist
      expect(await fs.access(path.join(testDir, 'c2c-rules', 'global.md')).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(testDir, 'c2c-rules', '_root.md')).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(testDir, 'CLAUDE.md')).then(() => true).catch(() => false)).toBe(true);
      
      // App output should exist
      expect(await fs.access(path.join(testDir, 'app', 'c2c-rules', 'app.md')).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(testDir, 'app', 'c2c-rules', '_root.md')).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(testDir, 'app', 'CLAUDE.md')).then(() => true).catch(() => false)).toBe(true);
    });
  });

  describe('Complex Directory Structures', () => {
    it('should handle deeply nested .cursor directories', async () => {
      // Arrange
      const deepCursor = path.join(testDir, 'a', 'b', 'c', '.cursor', 'd', 'e');
      await fs.mkdir(deepCursor, { recursive: true });
      
      await fs.writeFile(
        path.join(deepCursor, 'deep.mdc'),
        '---\ndescription: "Deep nested rules"\n---\n# Deep Rules'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toContain('Converting files to c2c-rules directory...');
      
      const outputPath = path.join(testDir, 'a', 'b', 'c', 'c2c-rules', 'd', 'e', 'deep.md');
      const rootPath = path.join(testDir, 'a', 'b', 'c', 'c2c-rules', '_root.md');
      
      expect(await fs.readFile(outputPath, 'utf-8')).toBe('# Deep Rules');
      expect(await fs.readFile(rootPath, 'utf-8')).toContain('Deep nested rules');
    });

    it('should handle .cursor directories with no .mdc files', async () => {
      // Arrange
      const emptyCursor = path.join(testDir, '.cursor');
      await fs.mkdir(emptyCursor, { recursive: true });
      
      // Create a non-.mdc file to ensure directory is not empty
      await fs.writeFile(path.join(emptyCursor, 'README.md'), '# Cursor Rules');

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toContain('Processing root .cursor directory...');
      // The directory exists but has no .mdc files
      
      // No output files should be created
      expect(await fs.access(path.join(testDir, 'c2c-rules')).then(() => true).catch(() => false)).toBe(false);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle files with invalid YAML metadata gracefully', async () => {
      // Arrange
      const cursorDir = path.join(testDir, '.cursor');
      await fs.mkdir(cursorDir, { recursive: true });
      
      await fs.writeFile(
        path.join(cursorDir, 'invalid.mdc'),
        '---\ninvalid yaml: [unclosed\n---\n# Content'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toContain('✓ Created c2c-rules/invalid.md');
      
      // Should treat entire content as body when YAML fails
      const output = await fs.readFile(path.join(testDir, 'c2c-rules', 'invalid.md'), 'utf-8');
      expect(output).toBe('---\ninvalid yaml: [unclosed\n---\n# Content');
    });

    it('should handle Windows-style line endings', async () => {
      // Arrange
      const cursorDir = path.join(testDir, '.cursor');
      await fs.mkdir(cursorDir, { recursive: true });
      
      await fs.writeFile(
        path.join(cursorDir, 'windows.mdc'),
        '---\r\nalwaysApply: true\r\n---\r\n# Windows Rules\r\n\r\nContent with CRLF'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toContain('✓ Created c2c-rules/windows.md');
      
      const output = await fs.readFile(path.join(testDir, 'c2c-rules', 'windows.md'), 'utf-8');
      expect(output).toBe('# Windows Rules\r\n\r\nContent with CRLF');
    });

    it('should update existing CLAUDE.md file correctly', async () => {
      // Arrange
      const cursorDir = path.join(testDir, '.cursor');
      await fs.mkdir(cursorDir, { recursive: true });
      
      // Create existing CLAUDE.md with content
      await fs.writeFile(
        path.join(testDir, 'CLAUDE.md'),
        '# Existing Project Documentation\n\nSome content here.\n\n## Another section\n\nMore content.'
      );
      
      await fs.writeFile(
        path.join(cursorDir, 'rule.mdc'),
        '---\nalwaysApply: true\n---\n# Rules'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toContain('✓ Updated');
      expect(stdout).toContain('CLAUDE.md');
      
      const claudeMd = await fs.readFile(path.join(testDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeMd).toContain('# Existing Project Documentation');
      expect(claudeMd).toContain('Some content here.');
      expect(claudeMd).toContain('<c2c-rules>');
      expect(claudeMd).toContain('- @c2c-rules/_root.md');
      expect(claudeMd).toContain('</c2c-rules>');
    });

    it('should handle special characters in file names', async () => {
      // Arrange
      const cursorDir = path.join(testDir, '.cursor');
      await fs.mkdir(cursorDir, { recursive: true });
      
      await fs.writeFile(
        path.join(cursorDir, 'special-chars_test.mdc'),
        '---\ndescription: "Special chars"\n---\n# Special'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toContain('✓ Created c2c-rules/special-chars_test.md');
      
      const output = await fs.readFile(path.join(testDir, 'c2c-rules', 'special-chars_test.md'), 'utf-8');
      expect(output).toBe('# Special');
    });
  });

  describe('Performance and Large Scale', () => {
    it('should handle projects with many .mdc files efficiently', async () => {
      // Arrange
      const cursorDir = path.join(testDir, '.cursor');
      await fs.mkdir(cursorDir, { recursive: true });
      
      // Create 20 .mdc files
      const filePromises = [];
      for (let i = 0; i < 20; i++) {
        filePromises.push(
          fs.writeFile(
            path.join(cursorDir, `rule-${i}.mdc`),
            `---\ndescription: "Rule ${i}"\n---\n# Rule ${i}`
          )
        );
      }
      await Promise.all(filePromises);

      // Act
      const startTime = Date.now();
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);
      const executionTime = Date.now() - startTime;

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toContain('Converting files to c2c-rules directory...');
      expect(executionTime).toBeLessThan(5000); // Should complete in less than 5 seconds
      
      // Verify all files were created
      for (let i = 0; i < 20; i++) {
        const filePath = path.join(testDir, 'c2c-rules', `rule-${i}.md`);
        expect(await fs.access(filePath).then(() => true).catch(() => false)).toBe(true);
      }
    });
  });
});