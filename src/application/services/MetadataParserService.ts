import { FileInfo } from '../../domain/models/FileInfo.js';
import { ParsedCursorRule, CursorRuleMetadata } from '../../domain/models/CursorRuleMetadata.js';
import * as yaml from 'js-yaml';

export class MetadataParserService {
  parseFiles(files: FileInfo[]): ParsedCursorRule[] {
    return files.map(file => this.parseFile(file));
  }

  private parseFile(file: FileInfo): ParsedCursorRule {
    const { metadata, content } = this.extractMetadata(file.content);
    
    return {
      metadata,
      content,
      fileName: file.fileName,
      relativePath: file.relativePath
    };
  }

  private extractMetadata(fileContent: string): { metadata: CursorRuleMetadata; content: string } {
    // Handle both Unix (\n) and Windows (\r\n) line endings
    const metadataRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
    const match = fileContent.match(metadataRegex);

    if (!match) {
      return {
        metadata: {},
        content: fileContent
      };
    }

    try {
      const yamlContent = match[1];
      const metadata = yaml.load(yamlContent) as CursorRuleMetadata || {};
      const content = fileContent.slice(match[0].length).trim();

      return { metadata, content };
    } catch (error) {
      // If YAML parsing fails, treat entire content as body
      return {
        metadata: {},
        content: fileContent
      };
    }
  }
}