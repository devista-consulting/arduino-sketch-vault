/**
 * Mock filesystem for testing file operations
 */

import * as fs from 'fs';
import * as path from 'path';

export class MockFileSystem {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();

  constructor() {
    // Add workspace directory by default
    this.directories.add('/test/workspace');
  }

  // ==================== File Operations ====================

  writeFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!this.directories.has(dir)) {
      throw new Error(`Directory does not exist: ${dir}`);
    }
    this.files.set(filePath, content);
  }

  readFile(filePath: string): string {
    const content = this.files.get(filePath);
    if (content === undefined) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    return content;
  }

  existsSync(filePath: string): boolean {
    return this.files.has(filePath) || this.directories.has(filePath);
  }

  unlinkSync(filePath: string): void {
    if (!this.files.has(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    this.files.delete(filePath);
  }

  // ==================== Directory Operations ====================

  mkdirSync(dirPath: string, options?: { recursive?: boolean }): void {
    if (options?.recursive) {
      // Create all parent directories
      const parts = dirPath.split('/').filter(p => p);
      let currentPath = '';
      for (const part of parts) {
        currentPath += '/' + part;
        this.directories.add(currentPath);
      }
    } else {
      const parent = path.dirname(dirPath);
      if (!this.directories.has(parent)) {
        throw new Error(`Parent directory does not exist: ${parent}`);
      }
      this.directories.add(dirPath);
    }
  }

  readdirSync(dirPath: string): string[] {
    if (!this.directories.has(dirPath)) {
      throw new Error(`Directory does not exist: ${dirPath}`);
    }

    const results: string[] = [];
    const dirPrefix = dirPath.endsWith('/') ? dirPath : dirPath + '/';

    // Find all files and directories in this directory
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(dirPrefix)) {
        const relativePath = filePath.substring(dirPrefix.length);
        const firstPart = relativePath.split('/')[0];
        if (firstPart && !results.includes(firstPart)) {
          results.push(firstPart);
        }
      }
    }

    for (const dir of this.directories) {
      if (dir.startsWith(dirPrefix) && dir !== dirPath) {
        const relativePath = dir.substring(dirPrefix.length);
        const firstPart = relativePath.split('/')[0];
        if (firstPart && !results.includes(firstPart)) {
          results.push(firstPart);
        }
      }
    }

    return results;
  }

  // ==================== Test Helpers ====================

  clear(): void {
    this.files.clear();
    this.directories.clear();
    this.directories.add('/test/workspace');
  }

  addFile(filePath: string, content: string): void {
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    if (!this.directories.has(dir)) {
      this.mkdirSync(dir, { recursive: true });
    }
    this.files.set(filePath, content);
  }

  addDirectory(dirPath: string): void {
    this.mkdirSync(dirPath, { recursive: true });
  }

  getFile(filePath: string): string | undefined {
    return this.files.get(filePath);
  }

  hasFile(filePath: string): boolean {
    return this.files.has(filePath);
  }

  hasDirectory(dirPath: string): boolean {
    return this.directories.has(dirPath);
  }

  getAllFiles(): Map<string, string> {
    return new Map(this.files);
  }

  getAllDirectories(): Set<string> {
    return new Set(this.directories);
  }

  // ==================== Mock fs module ====================

  static createFsMock(): Partial<typeof fs> & { _mockInstance: MockFileSystem } {
    const mockFs = new MockFileSystem();

    return {
      writeFileSync: ((path: any, data: any) => {
        mockFs.writeFile(path.toString(), data.toString());
      }) as typeof fs.writeFileSync,

      readFileSync: ((path: any, options?: any): any => {
        const content = mockFs.readFile(path.toString());
        if (options?.encoding === 'utf8' || options === 'utf8') {
          return content;
        }
        return Buffer.from(content);
      }) as typeof fs.readFileSync,

      existsSync: ((path: any): boolean => {
        return mockFs.existsSync(path.toString());
      }) as typeof fs.existsSync,

      unlinkSync: ((path: any): void => {
        mockFs.unlinkSync(path.toString());
      }) as typeof fs.unlinkSync,

      mkdirSync: ((path: any, options?: any): any => {
        mockFs.mkdirSync(path.toString(), options);
      }) as typeof fs.mkdirSync,

      readdirSync: ((path: any, options?: any): any => {
        return mockFs.readdirSync(path.toString());
      }) as typeof fs.readdirSync,

      // Expose the mock instance for test helpers
      _mockInstance: mockFs
    };
  }
}

export default MockFileSystem;
