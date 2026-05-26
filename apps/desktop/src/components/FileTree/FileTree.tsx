import { type IFile } from '@/helper/filesys'
import { useEditorStore } from '@/stores'
import NiceModal from '@ebay/nice-modal-react'
import { invoke } from '@tauri-apps/api/core'
import { nanoid } from 'nanoid'
import type { FC } from 'react'
import { memo, useDeferredValue, useMemo } from 'react'
import { Tree, TreeApi } from 'react-arborist'
import { TreeProps } from 'react-arborist/dist/module/types/tree-props'
import { useTranslation } from 'react-i18next'
import { FillFlexParent } from '../fill-flex-parent'
import { MODAL_CONFIRM_ID } from '../Modal'
import { showContextMenu } from '../ui-v2/ContextMenu'
import { moveFileNode } from './file-operator'
import FileNode from './FileNode'
import { SimpleTree } from './SimpleTree'

export const fileTreeHandler: {
  rootTree: undefined | TreeApi<IFile>
  updateTreeView: undefined | ((params: { data: IFile[] }) => void)
} = {
  rootTree: undefined,
  updateTreeView: undefined,
}

const collectAllIds = (nodes: IFile[], acc: Record<string, boolean> = {}) => {
  const stack = [...nodes]

  while (stack.length > 0) {
    const n = stack.pop()
    if (!n) continue

    if (n.kind === 'dir') {
      acc[n.id] = true
      if (n.children) stack.push(...n.children)
    }
  }

  return acc
}

const FileTree: FC<FileTreeProps> = (props) => {
  const { data, sourceData = data, onSelect, dndRootElement, openAll } = props
  const { activeId, setFolderDataPure } = useEditorStore()
  const deferredActiveId = useDeferredValue(activeId)
  const { t } = useTranslation()
  const sourceTree = useMemo(() => new SimpleTree<IFile>(sourceData ?? data), [sourceData, data])

  if (data === null) return null

  const onMove: TreeProps<IFile>['onMove'] = async (args) => {
    const _dragNodes = args.dragNodes.filter((node) => {
      return !args.dragIds.includes(node.parent?.id || '')
    })
    // current only can move one file
    const _dragNode = _dragNodes[0]
    const parentNode = args.parentNode

    if (!parentNode || _dragNode.parent?.id === parentNode.id) {
      return
    }
    const targetPath = await invoke<string>('path_join', {
      path1: parentNode.data.path,
      path2: _dragNode.data.name,
    })
    const isExist = await invoke<boolean>('file_exists', { filePath: targetPath })

    if (isExist) {
      NiceModal.show(MODAL_CONFIRM_ID, {
        title: t('confirm.replace.description', {
          name: _dragNode.data.name,
        }),
        onConfirm: () => move(true),
      })
    } else {
      NiceModal.show(MODAL_CONFIRM_ID, {
        title: t('confirm.move.description', {
          name: _dragNode.data.name,
        }),
        onConfirm: () => move(),
      })
    }
    const move = (replace = false) => {
      invoke('move_files_to_target_folder', {
        files: _dragNodes.map((node) => node.data.path),
        targetFolder: parentNode.data.path,
        replaceExist: replace,
      }).then((res) => {
        if (Array.isArray(res)) {
          res.forEach((moveFileInfo) => {
            moveFileNode(sourceTree, moveFileInfo)
          })

          const _dragIds = _dragNodes.map((node) => node.data.id)
          for (const id of _dragIds) {
            sourceTree.move({ id, parentId: args.parentId, index: args.index })
          }
          setFolderDataPure(sourceTree.data)
        }
      })
    }
  }

  if (!dndRootElement) {
    return null
  }

  return (
    <FillFlexParent>
      {(dimens) => (
        <Tree
          {...dimens}
          data={data}
          dndRootElement={dndRootElement}
          openByDefault={!!openAll}
          initialOpenState={
            openAll
              ? collectAllIds(data)
              : {
                  [data[0]?.id]: true,
                }
          }
          selection={deferredActiveId}
          indent={openAll ? 10 : 16}
          disableMultiSelection
          onSelect={(node) => onSelect(node[0]?.data)}
          onMove={onMove}
          onContextMenu={(e) => {
            const items = []
            const workspaceRoot = data[0]
            if (workspaceRoot) {
              items.push(
                {
                  label: t('contextmenu.explorer.add_file'),
                  value: 'new_file',
                  handler: () => {
                    const data = { id: nanoid(), name: '', kind: 'pending_new_file' } as any
                    fileTreeHandler.rootTree?.open(workspaceRoot.id)
                    sourceTree.create({
                      parentId: workspaceRoot.id,
                      data,
                    })
                    fileTreeHandler.rootTree?.create({
                      parentId: workspaceRoot.id,
                      index: 0,
                    })

                    setFolderDataPure(sourceTree.data)
                  },
                },
                {
                  label: t('contextmenu.explorer.add_folder'),
                  value: 'new_folder',
                  handler: () => {
                    const data = {
                      id: nanoid(),
                      name: '',
                      kind: 'pending_new_folder',
                      children: [],
                    } as any
                    fileTreeHandler.rootTree?.open(workspaceRoot.id)

                    sourceTree.create({
                      parentId: workspaceRoot.id,
                      data,
                    })
                    fileTreeHandler.rootTree?.create({
                      parentId: workspaceRoot.id,
                      index: 0,
                      type: 'internal',
                    })

                    setFolderDataPure(sourceTree.data)
                  },
                },
              )
            }

            if (items.length === 0) return
            showContextMenu({
              x: e.clientX,
              y: e.clientY,
              items,
            })
          }}
        >
          {(props) => {
            const isRoot = props.node.id === data[0]?.id
            if (isRoot) {
              fileTreeHandler.rootTree = props.tree
              fileTreeHandler.updateTreeView = (params) => {
                fileTreeHandler.rootTree?.update({
                  data: params.data,
                })
                useEditorStore.getState().setFolderDataPure(params.data)
              }
            }
            return FileNode({
              ...props,
              simpleTree: sourceTree,
              setFolderData: setFolderDataPure,
              isRoot,
            })
          }}
        </Tree>
      )}
    </FillFlexParent>
  )
}

interface FileTreeProps extends BaseComponentProps {
  data: IFile[]
  sourceData?: IFile[] | null
  activeId?: string
  onSelect: (file: IFile) => void
  dndRootElement: Node
  openAll?: boolean
}

export default memo(FileTree)
