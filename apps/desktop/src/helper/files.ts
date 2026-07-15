import type { IFile } from './filesys';

type IEntries = Record<string, IFile>;

export const entries: IEntries = {}
export const pathEntries: IEntries = {}

export const saveOpenedEditorEntries: Record<string, () => Promise<void>> = {}

export function setSaveOpenedEditorEntries(id: string, saveHandler: () => Promise<void>): void {
  saveOpenedEditorEntries[id] = saveHandler
}

export function getSaveOpenedEditorEntries(id: string): (() => void) | undefined {
  return saveOpenedEditorEntries[id]
}

export function delSaveOpenedEditorEntries(id: string): void {
  delete saveOpenedEditorEntries[id]
}

export function setFileObject(id: string, file: IFile): void {
  entries[id] = file
}

export function getFileObject(id: string): IFile {
  return entries[id]
}

export function updateFileObject(id: string, file: IFile): void {
  entries[id] = file
}

export function setFileObjectByPath(path: string, file: IFile): void {
  pathEntries[path] = file
}

export function getFileObjectByPath(path?: string): undefined | IFile {
  if (!path) {
    return undefined
  }
  return pathEntries[path]
}

export function replaceFileObjects(files: IFile[]): void {
  Object.keys(entries).forEach((id) => delete entries[id])
  Object.keys(pathEntries).forEach((path) => delete pathEntries[path])
  Object.keys(saveOpenedEditorEntries).forEach((id) => delete saveOpenedEditorEntries[id])

  const add = (file: IFile) => {
    entries[file.id] = file
    if (file.path) pathEntries[file.path] = file
    file.children?.forEach(add)
  }

  files.forEach(add)
}
