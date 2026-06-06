import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('MfIconButton accessibility contract', () => {
  it('renders clickable icon chrome as semantic buttons', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const iconButtonSource = readFileSync(join(currentDir, 'icon-button.tsx'), 'utf8')
    const iconLabelButtonSource = readFileSync(join(currentDir, 'icon-label-button.tsx'), 'utf8')

    expect(iconButtonSource).toContain("type='button'")
    expect(iconButtonSource).toContain('aria-label={ariaLabel}')
    expect(iconButtonSource).toContain("aria-hidden='true'")

    expect(iconLabelButtonSource).toContain('const Wrapper = styled.button')
    expect(iconLabelButtonSource).toContain("type='button'")
    expect(iconLabelButtonSource).toContain('aria-label={ariaLabel}')
    expect(iconLabelButtonSource).toContain("aria-hidden='true'")
  })
})
