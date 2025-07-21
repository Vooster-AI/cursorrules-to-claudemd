import { promises as fs } from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('E2E: Cross-Platform Compatibility', () => {
  let testDir: string;
  const CLI_PATH = path.join(process.cwd(), 'dist', 'presentation', 'cli.js');

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `c2c-cross-platform-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Path Separator Handling', () => {
    it('should handle paths correctly regardless of platform', async () => {
      // Arrange - Create a deeply nested structure
      const deepPath = path.join(testDir, 'src', 'components', 'ui', '.cursor');
      await fs.mkdir(deepPath, { recursive: true });
      
      await fs.writeFile(
        path.join(deepPath, 'button.mdc'),
        '---\nglobs: "src/components/**/*.tsx"\n---\n# Button Rules'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toBeTruthy();
      expect(stdout).toContain('Converting files to c2c-rules directory...');
      
      // Verify the output file exists at the correct path
      const outputPath = path.join(testDir, 'src', 'components', 'ui', 'c2c-rules', 'button.md');
      expect(await fs.access(outputPath).then(() => true).catch(() => false)).toBe(true);
      
      // Verify the _root.md file has correct forward slashes for markdown links
      const rootPath = path.join(testDir, 'src', 'components', 'ui', 'c2c-rules', '_root.md');
      const rootContent = await fs.readFile(rootPath, 'utf-8');
      
      // Markdown links should always use forward slashes
      expect(rootContent).toContain('path: button.md');
      expect(rootContent).not.toContain('\\'); // No backslashes in markdown
    });

    it('should generate consistent markdown links across platforms', async () => {
      // Arrange
      const nestedCursor = path.join(testDir, 'backend', 'api', '.cursor', 'v1', 'routes');
      await fs.mkdir(nestedCursor, { recursive: true });
      
      await fs.writeFile(
        path.join(nestedCursor, 'auth.mdc'),
        '---\nalwaysApply: true\n---\n# Auth Routes'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toBeTruthy();
      expect(stdout).toContain('Converting files to c2c-rules directory...');
      
      const rootPath = path.join(testDir, 'backend', 'api', 'c2c-rules', '_root.md');
      const rootContent = await fs.readFile(rootPath, 'utf-8');
      
      // Check that the path in _root.md uses forward slashes
      expect(rootContent).toContain('@v1/routes/auth.md');
      expect(rootContent).not.toContain('@v1\\routes\\auth.md');
    });
  });

  describe('Line Ending Handling', () => {
    it('should parse files with Unix line endings (LF)', async () => {
      // Arrange
      const cursorDir = path.join(testDir, '.cursor');
      await fs.mkdir(cursorDir, { recursive: true });
      
      await fs.writeFile(
        path.join(cursorDir, 'unix.mdc'),
        '---\nalwaysApply: true\n---\n# Unix File\n\nContent with LF'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toBeTruthy();
      const output = await fs.readFile(path.join(testDir, 'c2c-rules', 'unix.md'), 'utf-8');
      expect(output).toBe('# Unix File\n\nContent with LF');
    });

    it('should parse files with Windows line endings (CRLF)', async () => {
      // Arrange
      const cursorDir = path.join(testDir, '.cursor');
      await fs.mkdir(cursorDir, { recursive: true });
      
      await fs.writeFile(
        path.join(cursorDir, 'windows.mdc'),
        '---\r\nalwaysApply: true\r\n---\r\n# Windows File\r\n\r\nContent with CRLF'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toBeTruthy();
      const output = await fs.readFile(path.join(testDir, 'c2c-rules', 'windows.md'), 'utf-8');
      expect(output).toBe('# Windows File\r\n\r\nContent with CRLF');
    });

    it('should parse files with mixed line endings', async () => {
      // Arrange
      const cursorDir = path.join(testDir, '.cursor');
      await fs.mkdir(cursorDir, { recursive: true });
      
      // Mix of LF and CRLF
      await fs.writeFile(
        path.join(cursorDir, 'mixed.mdc'),
        '---\r\ndescription: "Mixed endings"\n---\r\n# Mixed File\n\r\nSome content'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toBeTruthy();
      expect(stdout).toContain('✓ Created c2c-rules/mixed.md');
      
      const rootContent = await fs.readFile(path.join(testDir, 'c2c-rules', '_root.md'), 'utf-8');
      expect(rootContent).toContain('Mixed endings');
    });
  });

  describe('File System Edge Cases', () => {
    it('should handle paths with spaces', async () => {
      // Arrange
      const spacePath = path.join(testDir, 'my project', '.cursor');
      await fs.mkdir(spacePath, { recursive: true });
      
      await fs.writeFile(
        path.join(spacePath, 'space rule.mdc'),
        '---\ndescription: "Rules with spaces"\n---\n# Space Rules'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toBeTruthy();
      
      const outputPath = path.join(testDir, 'my project', 'c2c-rules', 'space rule.md');
      expect(await fs.access(outputPath).then(() => true).catch(() => false)).toBe(true);
      
      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toBe('# Space Rules');
    });

    it('should handle Unicode characters in paths and filenames', async () => {
      // Arrange
      const unicodePath = path.join(testDir, 'プロジェクト', '.cursor');
      await fs.mkdir(unicodePath, { recursive: true });
      
      await fs.writeFile(
        path.join(unicodePath, 'ルール.mdc'),
        '---\nglobs: "**/*.js"\n---\n# 日本語ルール'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toBeTruthy();
      
      const outputPath = path.join(testDir, 'プロジェクト', 'c2c-rules', 'ルール.md');
      expect(await fs.access(outputPath).then(() => true).catch(() => false)).toBe(true);
      
      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toBe('# 日本語ルール');
    });

    it('should handle very long paths', async () => {
      // Arrange - Create a very deeply nested structure
      let longPath = testDir;
      for (let i = 0; i < 10; i++) {
        longPath = path.join(longPath, `level${i}`);
      }
      const cursorPath = path.join(longPath, '.cursor');
      await fs.mkdir(cursorPath, { recursive: true });
      
      await fs.writeFile(
        path.join(cursorPath, 'deep.mdc'),
        '---\nalwaysApply: true\n---\n# Deep Rules'
      );

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toBeTruthy();
      expect(stdout).toContain('✓ Created');
      expect(stdout).toContain('deep.md');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple projects processed simultaneously', async () => {
      // Arrange - Create multiple projects
      const projects = ['frontend', 'backend', 'shared', 'tools', 'docs'];
      
      await Promise.all(projects.map(async (project) => {
        const cursorPath = path.join(testDir, project, '.cursor');
        await fs.mkdir(cursorPath, { recursive: true });
        
        await fs.writeFile(
          path.join(cursorPath, `${project}.mdc`),
          `---\nalwaysApply: true\n---\n# ${project} Rules`
        );
      }));

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toBeTruthy();
      expect(stdout).toContain('Conversion completed successfully!');
      
      // Verify all outputs exist
      await Promise.all(projects.map(async (project) => {
        const outputPath = path.join(testDir, project, 'c2c-rules', `${project}.md`);
        expect(await fs.access(outputPath).then(() => true).catch(() => false)).toBe(true);
        
        const claudePath = path.join(testDir, project, 'CLAUDE.md');
        expect(await fs.access(claudePath).then(() => true).catch(() => false)).toBe(true);
      }));
    });
  });

  describe('Permission and Access Scenarios', () => {
    it('should handle read-only source files', async () => {
      // Arrange
      const cursorDir = path.join(testDir, '.cursor');
      await fs.mkdir(cursorDir, { recursive: true });
      
      const readOnlyFile = path.join(cursorDir, 'readonly.mdc');
      await fs.writeFile(readOnlyFile, '---\nalwaysApply: true\n---\n# Read Only');
      
      // Make file read-only (works on Unix-like systems)
      if (process.platform !== 'win32') {
        await fs.chmod(readOnlyFile, 0o444);
      }

      // Act
      const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

      // Assert
      expect(stderr).toBe('');
      expect(stdout).toBeTruthy();
      expect(stdout).toContain('✓ Created c2c-rules/readonly.md');
      
      // Restore permissions for cleanup
      if (process.platform !== 'win32') {
        await fs.chmod(readOnlyFile, 0o644);
      }
    });
  });
});