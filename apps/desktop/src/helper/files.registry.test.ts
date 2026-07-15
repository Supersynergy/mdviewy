import { describe, expect, it } from 'vitest'
import {
  getFileObject,
  getFileObjectByPath,
  replaceFileObjects,
  saveOpenedEditorEntries,
  setFileObject,
  setFileObjectByPath,
} from './files'
import type { IFile } from './filesys'

describe('workspace file registry', () => {
  it('replaces stale workspace entries and save callbacks as one operation', () => {
    const oldFile: IFile = { id: 'old', name: 'old.md', kind: 'file', path: '/old/old.md' }
    const nextFile: IFile = { id: 'next', name: 'next.md', kind: 'file', path: '/next/next.md' }
    const root: IFile = {
      id: 'root',
      name: 'next',
      kind: 'dir',
      path: '/next',
      children: [nextFile],
    }
    setFileObject(oldFile.id, oldFile)
    setFileObjectByPath(oldFile.path!, oldFile)
    saveOpenedEditorEntries.old = async () => undefined

    replaceFileObjects([root])

    expect(getFileObject('old')).toBeUndefined()
    expect(getFileObjectByPath('/old/old.md')).toBeUndefined()
    expect(saveOpenedEditorEntries.old).toBeUndefined()
    expect(getFileObject('next')).toBe(nextFile)
    expect(getFileObjectByPath('/next')).toBe(root)
  })
})
