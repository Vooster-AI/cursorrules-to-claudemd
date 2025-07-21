import path from "path";
import { FileInfo } from "../../domain/models/FileInfo.js";
import { FileSystemUtils } from "../../infrastructure/utils/FileSystemUtils.js";

export class RootFileGeneratorService {
  private readonly outputDir = "c2c-rules";

  async generateRootFile(files: FileInfo[], rootPath: string): Promise<void> {
    const rootFilePath = path.join(rootPath, this.outputDir, "_root.md");
    const content = this.buildRootContent(files);

    await FileSystemUtils.writeFile(rootFilePath, content);
    console.log(`✓ Generated ${path.relative(rootPath, rootFilePath)}`);
  }

  private buildRootContent(files: FileInfo[]): string {
    const filesByProject = this.groupFilesByProject(files);

    let content = "# Rules Collection\n\n";
    content +=
      "This file contains references to all converted cursor rules.\n\n";
    content += "## Files\n\n";

    for (const [project, projectFiles] of Object.entries(filesByProject)) {
      content += `### ${project || "root"}\n`;

      for (const file of projectFiles) {
        const displayPath = this.getDisplayPath(file.relativePath);
        const linkPath = this.getLinkPath(file.relativePath);
        content += `- ${displayPath}: @${linkPath}\n`;
      }

      content += "\n";
    }

    content += `Total files: ${files.length}`;

    return content;
  }

  private groupFilesByProject(files: FileInfo[]): Record<string, FileInfo[]> {
    const groups: Record<string, FileInfo[]> = {};

    for (const file of files) {
      const projectName = this.extractProjectName(file.relativePath);

      if (!groups[projectName]) {
        groups[projectName] = [];
      }

      groups[projectName].push(file);
    }

    return groups;
  }

  private extractProjectName(relativePath: string): string {
    const parts = relativePath.split(path.sep);
    const cursorIndex = parts.indexOf(".cursor");

    if (cursorIndex > 0) {
      return parts[cursorIndex - 1];
    }

    if (cursorIndex === 0) {
      return "root";
    }

    return parts[0] || "root";
  }

  private getDisplayPath(relativePath: string): string {
    const parts = relativePath.split(path.sep);
    const cursorIndex = parts.indexOf(".cursor");

    if (cursorIndex !== -1) {
      const afterCursor = parts.slice(cursorIndex + 1);
      const fileName = afterCursor.pop()?.replace(".mdc", "") || "";

      if (afterCursor.length > 0) {
        // For display paths in markdown, use forward slashes
        return `${afterCursor.join("/")}/${fileName}`;
      }

      return fileName;
    }

    return relativePath.replace(".mdc", "");
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

    return relativePath.split(path.sep).join("/").replace(".mdc", ".md");
  }
}
