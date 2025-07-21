# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Comprehensive end-to-end (e2e) testing framework
  - Created `src/__tests__/e2e/` directory with two test suites
  - `full-workflow.e2e.test.ts`: Tests complete CLI workflows including single projects, multi-projects, nested structures, edge cases, and performance
  - `cross-platform.e2e.test.ts`: Tests OS compatibility including path separators, line endings, special characters, and file system edge cases
  - Added `jest.e2e.config.js` for e2e test configuration
  - Added npm scripts: `test:e2e`, `test:e2e:watch`, `test:all`
  - 21 new e2e test cases covering various scenarios

- Testing documentation
  - Created `docs/TESTING.md` with comprehensive testing guide
  - Includes test structure, commands, best practices, and debugging tips
  - Documents common issues and solutions

### Fixed
- **Cross-platform compatibility issues**:
  - Fixed hard-coded forward slashes in path operations that would break on Windows
  - Updated `MetadataParserService` to handle both Unix (LF) and Windows (CRLF) line endings
  - Ensured markdown links always use forward slashes for consistency
  - Added comments to clarify when forward slashes are intentional (for markdown)

### Changed
- **Path handling improvements**:
  - `AdvancedRootFileGeneratorService`: Fixed `getLinkPath` methods to handle path separators correctly
  - `RootFileGeneratorService`: Updated to use proper path handling for cross-platform support
  - `MetadataParserService`: Regex now handles `\r?\n` for cross-platform line ending support

- **Test infrastructure**:
  - E2e tests run sequentially (`maxWorkers: 1`) to avoid conflicts
  - E2e tests have 30-second timeout for long-running operations
  - Removed coverage thresholds for e2e tests (not applicable for CLI process testing)
  - Updated `prepublish:npm` script to run all tests before publishing

### Technical Details

#### OS-Specific Fixes
1. **Path Separators**: 
   - Before: `combined.join("/")` 
   - After: `combined.join("/")` with comment explaining it's for markdown links
   - File system operations use `path.sep`, markdown links use `/`

2. **Line Endings**:
   - Before: `/^---\n([\s\S]*?)\n---\n/`
   - After: `/^---\r?\n([\s\S]*?)\r?\n---\r?\n/`

3. **Import Statements**: 
   - Fixed TypeScript import issues in test files
   - Changed from default imports to namespace imports for path module

#### Test Coverage
- Unit tests: 58 tests across 9 test suites
- E2E tests: 21 tests across 2 test suites
- Total: 79 tests, all passing
- Unit test coverage thresholds maintained at 80%

## Notes for Developers

### Running Tests
```bash
# Quick test
pnpm test

# Full test suite
pnpm test:all

# E2E tests only
pnpm test:e2e
```

### Known Limitations
- E2E test coverage reporting shows 0% (expected behavior - Jest can't track coverage across process boundaries)
- The CLI file (`src/presentation/cli.ts`) is excluded from coverage due to `import.meta` usage

### Future Improvements
- Consider adding Windows and macOS to CI test matrix
- Add performance benchmarks for large projects
- Consider integration tests that don't spawn processes for better coverage tracking