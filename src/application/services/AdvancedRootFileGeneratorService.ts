import path from "path";
import { ParsedCursorRule } from "../../domain/models/CursorRuleMetadata.js";
import { FileSystemUtils } from "../../infrastructure/utils/FileSystemUtils.js";

export class AdvancedRootFileGeneratorService {
  private readonly outputDir = "c2c-rules";

  async generateRootFile(
    rules: ParsedCursorRule[],
    rootPath: string
  ): Promise<void> {
    const rootFilePath = path.join(rootPath, this.outputDir, "_root.md");
    const content = this.buildAdvancedRootContent(rules);

    await FileSystemUtils.writeFile(rootFilePath, content);
    console.log(`✓ Generated ${path.relative(rootPath, rootFilePath)}`);
  }

  async generateRootFileForDirectory(
    rules: ParsedCursorRule[],
    cursorDir: string,
    outputDir: string
  ): Promise<void> {
    const rootFilePath = path.join(outputDir, "_root.md");
    const content = this.buildRootContentForDirectory(rules, cursorDir);

    await FileSystemUtils.writeFile(rootFilePath, content);
    console.log(`✓ Generated ${rootFilePath}`);
  }

  private buildAdvancedRootContent(rules: ParsedCursorRule[]): string {
    const alwaysApplyRules = rules.filter(
      (r) => r.metadata.alwaysApply === true
    );
    const descriptionRules = rules.filter(
      (r) => r.metadata.alwaysApply !== true && r.metadata.description
    );
    const globRules = rules.filter(
      (r) =>
        r.metadata.alwaysApply !== true &&
        !r.metadata.description &&
        r.metadata.globs
    );

    let content = "# Rules Collection\n\n";

    // Always Apply section
    if (alwaysApplyRules.length > 0) {
      content +=
        "you MUST read below files and STRICTLY FOLLOW as guidelines: \n";
      alwaysApplyRules.forEach((rule) => {
        const linkPath = this.getLinkPath(rule.relativePath);
        content += `- ${rule.fileName}: @${linkPath}\n`;
      });
      content += "\n";
    }

    // Description section
    if (descriptionRules.length > 0) {
      content +=
        "read below rules if description matches with your requirement:\n";
      descriptionRules.forEach((rule) => {
        const linkPath = this.getLinkPath(rule.relativePath);
        content += `- ${rule.fileName}\n`;
        content += `    - description: ${rule.metadata.description}\n`;
        content += `    - path: ${linkPath}\n`;
      });
      content += "\n";
    }

    // Glob section
    if (globRules.length > 0) {
      content +=
        "read below rules if glob pattern matches with requirement related files:\n";
      globRules.forEach((rule) => {
        const linkPath = this.getLinkPath(rule.relativePath);
        const globPattern = rule.metadata.globs!;
        content += `- ${rule.fileName}\n`;
        content += `    - glob: ${globPattern}\n`;
        content += `    - path: ${linkPath}\n`;
      });
      content += "\n";
    }

    return content.trim();
  }

  private getLinkPath(relativePath: string): string {
    const parts = relativePath.split(path.sep);
    const cursorIndex = parts.indexOf(".cursor");

    if (cursorIndex !== -1) {
      const projectParts = parts.slice(0, cursorIndex);
      const afterCursor = parts.slice(cursorIndex + 1);
      const combined = [...projectParts, ...afterCursor];

      // For markdown links, always use forward slashes
      return combined.join("/").replace(".mdc", ".md");
    }

    return relativePath.replace(path.sep, "/").replace(".mdc", ".md");
  }

  private buildRootContentForDirectory(
    rules: ParsedCursorRule[],
    cursorDir: string
  ): string {
    const alwaysApplyRules = rules.filter(
      (r) => r.metadata.alwaysApply === true
    );
    const descriptionRules = rules.filter(
      (r) => r.metadata.alwaysApply !== true && r.metadata.description
    );
    const globRules = rules.filter(
      (r) =>
        r.metadata.alwaysApply !== true &&
        !r.metadata.description &&
        r.metadata.globs
    );

    let content = "# Rules Collection\n\n";

    // Always Apply section
    if (alwaysApplyRules.length > 0) {
      content +=
        "you MUST read below files and STRICTLY FOLLOW as guidelines: \n";
      alwaysApplyRules.forEach((rule) => {
        const linkPath = this.getLinkPathForDirectory(rule.relativePath, cursorDir);
        content += `- ${rule.fileName}: @${linkPath}\n`;
      });
      content += "\n";
    }

    // Description section
    if (descriptionRules.length > 0) {
      content +=
        "read below rules if description matches with your requirement:\n";
      descriptionRules.forEach((rule) => {
        const linkPath = this.getLinkPathForDirectory(rule.relativePath, cursorDir);
        content += `- ${rule.fileName}\n`;
        content += `    - description: ${rule.metadata.description}\n`;
        content += `    - path: ${linkPath}\n`;
      });
      content += "\n";
    }

    // Glob section
    if (globRules.length > 0) {
      content +=
        "read below rules if glob pattern matches with requirement related files:\n";
      globRules.forEach((rule) => {
        const linkPath = this.getLinkPathForDirectory(rule.relativePath, cursorDir);
        const globPattern = rule.metadata.globs!;
        content += `- ${rule.fileName}\n`;
        content += `    - glob: ${globPattern}\n`;
        content += `    - path: ${linkPath}\n`;
      });
      content += "\n";
    }

    return content.trim();
  }

  private getLinkPathForDirectory(relativePath: string, _cursorDir: string): string {
    // Extract the part after .cursor in the original path
    const parts = relativePath.split(path.sep);
    const cursorIndex = parts.indexOf(".cursor");
    
    if (cursorIndex !== -1) {
      const afterCursor = parts.slice(cursorIndex + 1);
      // For markdown links, always use forward slashes
      return afterCursor.join("/").replace(".mdc", ".md");
    }
    
    // Fallback: use the filename if no .cursor found
    return path.basename(relativePath).replace(".mdc", ".md");
  }
}
