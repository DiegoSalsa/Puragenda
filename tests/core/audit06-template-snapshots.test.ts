import { describe, expect, it } from 'vitest';
import { templateSwitchDraft } from '@/websites/template-snapshots';
import { resolveTemplate } from '@/websites/registry';

describe('Audit 06 compatible editorial content', () => {
  it.each(['bella', 'matchday', 'ritual'])(`transfers a %s headline into every compatible design`, source => {
    const draftConfig = { ...resolveTemplate(source, 1).defaultConfig(), headline: 'Un titular propio del negocio' };
    for (const target of ['bella', 'matchday', 'ritual', 'y2k']) {
      const result = templateSwitchDraft({ templateKey: source, templateVersion: 1, draftConfig }, target, 1);
      expect(Array.isArray(result.config.headline) ? result.config.headline.join('') : result.config.headline).toBe(draftConfig.headline);
      expect(result.snapshots[`${source}@1`]).toMatchObject({ headline: draftConfig.headline });
    }
  });
  it('retains overlong incompatible headlines in their original snapshot', () => {
    const headline = 'Titular propio '.repeat(12).trim();
    const result = templateSwitchDraft({ templateKey: 'bella', templateVersion: 1, draftConfig: { ...resolveTemplate('bella', 1).defaultConfig(), headline } }, 'y2k', 1);
    expect(result.snapshots['bella@1']).toMatchObject({ headline });
    expect(resolveTemplate('y2k', 1).configSchema.parse(result.config)).toEqual(result.config);
  });
});
