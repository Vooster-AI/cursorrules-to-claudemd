# Testing Guide

This document provides a comprehensive guide to testing the c2c (Cursor to Claude) converter.

## Test Structure

The project uses a comprehensive testing strategy with two main categories:

### 1. Unit Tests
Located in `src/__tests__/` mirroring the source structure:
- **Application Services**: Test business logic and service interactions
- **Infrastructure**: Test file system utilities
- **Integration**: Test service orchestration

### 2. End-to-End (E2E) Tests
Located in `src/__tests__/e2e/`:
- **full-workflow.e2e.test.ts**: Tests complete CLI workflows
- **cross-platform.e2e.test.ts**: Tests OS compatibility

## Running Tests

### Basic Commands

```bash
# Run all unit tests
pnpm test

# Run unit tests in watch mode
pnpm test:watch

# Run unit tests with coverage
pnpm test:coverage

# Run e2e tests (builds first)
pnpm test:e2e

# Run e2e tests in watch mode
pnpm test:e2e:watch

# Run all tests (unit + e2e)
pnpm test:all
```

### Test Coverage

Unit tests have coverage thresholds configured in `jest.config.js`:
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

**Note**: E2E tests spawn CLI processes, so Jest cannot track coverage across process boundaries. Coverage metrics for e2e tests are not meaningful.

## Writing Tests

### Unit Test Example

```typescript
import { FileConverterService } from '../../../application/services/FileConverterService';
import { FileSystemUtils } from '../../../infrastructure/utils/FileSystemUtils';

jest.mock('../../../infrastructure/utils/FileSystemUtils');

describe('FileConverterService', () => {
  let service: FileConverterService;

  beforeEach(() => {
    service = new FileConverterService();
    jest.clearAllMocks();
  });

  it('should convert files to output directory', async () => {
    // Arrange
    const files = [{ /* ... */ }];
    
    // Act
    await service.convertFiles(files, '/root');
    
    // Assert
    expect(FileSystemUtils.writeFile).toHaveBeenCalled();
  });
});
```

### E2E Test Example

```typescript
describe('E2E: Full CLI Workflow', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `c2c-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should convert a simple project', async () => {
    // Arrange: Create test files
    await fs.mkdir(path.join(testDir, '.cursor'));
    await fs.writeFile(
      path.join(testDir, '.cursor', 'rule.mdc'),
      '---\nalwaysApply: true\n---\n# Content'
    );

    // Act: Run CLI
    const { stdout, stderr } = await execAsync(`cd "${testDir}" && node ${CLI_PATH}`);

    // Assert
    expect(stderr).toBe('');
    expect(stdout).toContain('Conversion completed successfully!');
  });
});
```

## Test Best Practices

### 1. Isolation
- Each test should be independent
- Use unique temporary directories with timestamps to avoid conflicts
- Clean up test artifacts in `afterEach` hooks

### 2. Cross-Platform Compatibility
- Use `path.join()` for file paths
- Test both Unix (LF) and Windows (CRLF) line endings
- Handle different path separators correctly

### 3. Async Operations
- Always use async/await for file operations
- Set appropriate timeouts for long-running tests
- E2E tests have a 30-second timeout

### 4. Test Data
- Use realistic test data that represents actual use cases
- Test edge cases (empty files, invalid YAML, special characters)
- Test various directory structures (nested, root-level, mixed)

## Common Issues and Solutions

### Race Conditions
**Problem**: Tests fail intermittently due to file system race conditions.
**Solution**: Use unique directory names with timestamps and random suffixes.

### Line Ending Issues
**Problem**: Tests fail on different operating systems due to line endings.
**Solution**: The metadata parser now handles both `\n` and `\r\n` endings.

### Path Separator Issues
**Problem**: Tests fail on Windows due to backslashes in paths.
**Solution**: 
- Use `path.join()` for file system operations
- Markdown links always use forward slashes

### Coverage Collection
**Problem**: E2E tests show 0% coverage.
**Solution**: This is expected as CLI processes can't be tracked by Jest. Focus on unit test coverage.

## Continuous Integration

When setting up CI:

1. Ensure the build step runs before tests:
   ```yaml
   - run: pnpm build
   - run: pnpm test:all
   ```

2. Consider running tests on multiple OS:
   ```yaml
   strategy:
     matrix:
       os: [ubuntu-latest, windows-latest, macos-latest]
   ```

3. Upload coverage reports from unit tests only:
   ```yaml
   - run: pnpm test:coverage
   - uses: codecov/codecov-action@v3
   ```

## Debugging Tests

### VSCode Configuration

Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-coverage", "${file}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Running Specific Tests

```bash
# Run tests matching a pattern
pnpm test -- --testNamePattern="should parse metadata"

# Run a specific test file
pnpm test src/__tests__/application/services/MetadataParserService.test.ts

# Run e2e tests with specific filter
pnpm test:e2e -- -t "should handle glob patterns"
```

## Test Metrics

Current test suite (as of last update):
- Total Tests: 79
- Unit Tests: 58
- E2E Tests: 21
- Test Suites: 11
- All tests passing ✅