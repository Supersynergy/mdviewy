import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = join(__dirname, '../../..')

const read = (path: string) => readFileSync(join(repoRoot, path), 'utf8')

describe('disabled updater surface', () => {
  it('does not auto-check updates during app setup or settings render', () => {
    expect(read('apps/desktop/src/hooks/useAppSetup.ts')).not.toContain('checkUpdate')
    expect(read('apps/desktop/src/router/Setting/index.tsx')).not.toContain('plugin-updater')
    expect(read('apps/desktop/src/router/Setting/index.tsx')).not.toContain('installUpdate')
  })

  it('does not expose updater scripts or helper code', () => {
    expect(read('package.json')).not.toContain('"updater"')
    expect(read('apps/desktop/package.json')).not.toContain('"updater"')
    expect(existsSync(join(repoRoot, 'apps/desktop/src/helper/updater.tsx'))).toBe(false)
  })

  it('does not register updater endpoints or the updater plugin', () => {
    expect(read('apps/desktop/src-tauri/tauri.conf.json')).not.toContain('api.upgrade.toolsetlink')
    expect(read('apps/desktop/src-tauri/tauri.conf.json')).not.toContain('"updater"')
    expect(read('apps/desktop/src-tauri/tauri.conf.json')).toContain(
      '"createUpdaterArtifacts": false',
    )
    expect(read('apps/desktop/src-tauri/src/lib.rs')).not.toContain('tauri_plugin_updater')
    expect(read('apps/desktop/src-tauri/capabilities/main-capability.json')).not.toContain(
      'updater:default',
    )
  })
})
