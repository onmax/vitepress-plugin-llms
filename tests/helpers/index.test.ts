import { describe, expect, it, mock } from 'bun:test'

import { defaultLLMsTxtTemplate } from '../../src/constants'

import { mockedFs } from '../mocks/fs'

mockedFs.default.readFile.mockReturnValue(Promise.resolve(fakeIndexMd))

mock.module('node:fs/promises', () => mockedFs)

import {
	generateLLMsFullTxt,
	generateLLMsTxt,
	organizeFilesByDepth,
	generateNavigationSection,
	generateDirectoryLLMsTxt,
	// @ts-ignore
} from '../../src/helpers'
import {
	fakeCustomLlmsTxtTemplate,
	fakeIndexMd,
	preparedFilesSample,
	preparedFilesDepthSample,
	sampleDomain,
	srcDir,
} from '../resources'

describe('generateLLMsTxt', () => {
	it('generates a `llms.txt` file', async () => {
		expect(
			await generateLLMsTxt(preparedFilesSample({ srcDir }).slice(1), {
				indexMd: `${srcDir}/index.md`,
				srcDir,
				LLMsTxtTemplate: defaultLLMsTxtTemplate,
				templateVariables: {},
				vitepressConfig: {},
			}),
		).toMatchSnapshot()
	})
	it('works correctly with a custom template', async () => {
		expect(
			await generateLLMsTxt(preparedFilesSample({ srcDir }).slice(1), {
				indexMd: `${srcDir}/index.md`,
				srcDir,
				LLMsTxtTemplate: fakeCustomLlmsTxtTemplate,
				templateVariables: {},
				vitepressConfig: {},
			}),
		).toMatchSnapshot()
	})
	it('works correctly with a custom template variables', async () => {
		expect(
			await generateLLMsTxt(preparedFilesSample({ srcDir }), {
				indexMd: `${srcDir}/index.md`,
				srcDir,
				LLMsTxtTemplate: defaultLLMsTxtTemplate,
				templateVariables: { title: 'foo', description: 'bar', toc: 'zoo' },
				vitepressConfig: {},
			}),
		).toMatchSnapshot()
	})

	it('works correctly with a custom template and variables', async () => {
		expect(
			await generateLLMsTxt(preparedFilesSample({ srcDir }), {
				indexMd: `${srcDir}/index.md`,
				srcDir,
				LLMsTxtTemplate: '# {foo}\n\n**{bar}**\n\n{zoo}',
				templateVariables: { title: 'foo', description: 'bar', toc: 'zoo' },
				vitepressConfig: {},
			}),
		).toMatchSnapshot()
	})
})

describe('generateLLMsFullTxt', () => {
	it('generates a `llms-full.txt` file', async () => {
		expect(
			await generateLLMsFullTxt(preparedFilesSample({ srcDir }).slice(1), {
				srcDir,
			}),
		).toMatchSnapshot()
	})

	it('correctly attaches the domain to URLs in context', async () => {
		expect(
			await generateLLMsFullTxt(preparedFilesSample({ srcDir }).slice(1), {
				srcDir,
				domain: sampleDomain,
			}),
		).toMatchSnapshot()
	})
})

describe('organizeFilesByDepth', () => {
	it('organizes files by depth level 1 (root only)', () => {
		const files = preparedFilesDepthSample({ srcDir })
		const chunks = organizeFilesByDepth(files, srcDir, 1, 2)

		expect(chunks).toHaveLength(1)
		expect(chunks[0].dirPath).toBe('')
		expect(chunks[0].depth).toBe(1)
		expect(chunks[0].files).toHaveLength(files.length)
	})

	it('organizes files by depth level 2', () => {
		const files = preparedFilesDepthSample({ srcDir })
		const chunks = organizeFilesByDepth(files, srcDir, 2, 2)

		expect(chunks.length).toBeGreaterThan(1)

		// Should have root chunk
		const rootChunk = chunks.find((c) => c.dirPath === '')
		expect(rootChunk).toBeDefined()

		// Should have guide, api, examples chunks
		const guideChunk = chunks.find((c) => c.dirPath === 'guide')
		const apiChunk = chunks.find((c) => c.dirPath === 'api')
		const examplesChunk = chunks.find((c) => c.dirPath === 'examples')

		expect(guideChunk).toBeDefined()
		expect(apiChunk).toBeDefined()
		expect(examplesChunk).toBeDefined()
	})

	it('organizes files by depth level 3', () => {
		const files = preparedFilesDepthSample({ srcDir })
		const chunks = organizeFilesByDepth(files, srcDir, 3, 2)

		// Should have more chunks including nested directories
		const advancedChunk = chunks.find((c) => c.dirPath === 'guide/advanced')
		const v2Chunk = chunks.find((c) => c.dirPath === 'api/v2')

		expect(advancedChunk).toBeDefined()
		expect(v2Chunk).toBeDefined()
	})

	it('respects minimum files per chunk', () => {
		const files = preparedFilesDepthSample({ srcDir })
		const chunks = organizeFilesByDepth(files, srcDir, 3, 5)

		// With minFilesPerChunk = 5, some smaller directories should be filtered out
		const nonRootChunks = chunks.filter((c) => c.dirPath !== '')
		expect(nonRootChunks.length).toBeLessThan(chunks.length)
	})

	it('sets correct navigation context', () => {
		const files = preparedFilesDepthSample({ srcDir })
		const chunks = organizeFilesByDepth(files, srcDir, 3, 2)

		const guideChunk = chunks.find((c) => c.dirPath === 'guide')
		const advancedChunk = chunks.find((c) => c.dirPath === 'guide/advanced')
		const apiChunk = chunks.find((c) => c.dirPath === 'api')
		const v2Chunk = chunks.find((c) => c.dirPath === 'api/v2')

		// Verify guide chunk (depth 2)
		expect(guideChunk?.parentPath).toBe('')
		expect(guideChunk?.siblingPaths).toContain('api')
		expect(guideChunk?.siblingPaths).toContain('examples')
		expect(guideChunk?.childPaths).toContain('guide/advanced')

		// Verify advanced chunk (depth 3, child of guide)
		expect(advancedChunk?.parentPath).toBe('guide')
		// Advanced chunk has no siblings at depth 3 with parent 'guide'
		expect(advancedChunk?.siblingPaths).toEqual([])

		// Verify api chunk (depth 2)
		expect(apiChunk?.siblingPaths).toContain('guide')
		expect(apiChunk?.siblingPaths).toContain('examples')
		expect(apiChunk?.childPaths).toContain('api/v2')

		// Verify v2 chunk (depth 3, child of api)
		expect(v2Chunk?.parentPath).toBe('api')
		// V2 chunk has no siblings at depth 3 with parent 'api'
		expect(v2Chunk?.siblingPaths).toEqual([])
	})
})

describe('generateNavigationSection', () => {
	it('generates navigation links for parent, siblings, and children', () => {
		const navigation = generateNavigationSection({
			currentDirPath: 'guide',
			parentPath: '',
			siblingPaths: ['api', 'examples'],
			childPaths: ['guide/advanced'],
			domain: undefined,
			srcDir,
			cleanUrls: false,
		})

		expect(navigation).toContain('Documentation Overview')
		expect(navigation).toContain('/llms.txt')
		expect(navigation).toContain('Api')
		expect(navigation).toContain('/api/llms.txt')
		expect(navigation).toContain('Examples')
		expect(navigation).toContain('/examples/llms.txt')
		expect(navigation).toContain('Advanced')
		expect(navigation).toContain('/guide/advanced/llms.txt')
	})

	it('generates navigation links with domain', () => {
		const navigation = generateNavigationSection({
			currentDirPath: 'api',
			parentPath: '',
			siblingPaths: ['guide'],
			childPaths: ['api/v2'],
			domain: sampleDomain,
			srcDir,
			cleanUrls: false,
		})

		expect(navigation).toContain(`${sampleDomain}/llms.txt`)
		expect(navigation).toContain(`${sampleDomain}/guide/llms.txt`)
		expect(navigation).toContain(`${sampleDomain}/api/v2/llms.txt`)
	})

	it('returns empty string when no navigation links exist', () => {
		const navigation = generateNavigationSection({
			currentDirPath: '',
			parentPath: '',
			siblingPaths: [],
			childPaths: [],
			domain: undefined,
			srcDir,
			cleanUrls: false,
		})

		expect(navigation).toBe('')
	})
})

describe('generateDirectoryLLMsTxt', () => {
	it('generates llms.txt for root directory', async () => {
		const files = preparedFilesDepthSample({ srcDir })
		const chunks = organizeFilesByDepth(files, srcDir, 1, 2)
		const rootChunk = chunks.find((c) => c.dirPath === '')!

		const result = await generateDirectoryLLMsTxt(rootChunk, {
			indexMd: `${srcDir}/index.md`,
			srcDir,
			templateVariables: { title: 'Test Documentation' },
			includeNavigation: true,
		})

		expect(result).toContain('# Test Documentation')
		expect(result).toContain('## Table of Contents')
		expect(result).toMatchSnapshot()
	})

	it('generates llms.txt for subdirectory with navigation', async () => {
		const files = preparedFilesDepthSample({ srcDir })
		const chunks = organizeFilesByDepth(files, srcDir, 2, 2)
		const guideChunk = chunks.find((c) => c.dirPath === 'guide')!

		const result = await generateDirectoryLLMsTxt(guideChunk, {
			indexMd: `${srcDir}/index.md`,
			srcDir,
			templateVariables: {},
			includeNavigation: true,
		})

		expect(result).toContain('# Guide Documentation')
		expect(result).toContain('## Navigation')
		expect(result).toContain('Documentation Overview')
		expect(result).toContain('## Documentation')
		expect(result).toMatchSnapshot()
	})

	it('generates llms.txt without navigation when disabled', async () => {
		const files = preparedFilesDepthSample({ srcDir })
		const chunks = organizeFilesByDepth(files, srcDir, 2, 2)
		const apiChunk = chunks.find((c) => c.dirPath === 'api')!

		const result = await generateDirectoryLLMsTxt(apiChunk, {
			indexMd: `${srcDir}/index.md`,
			srcDir,
			templateVariables: {},
			includeNavigation: false,
		})

		expect(result).toContain('# Api Documentation')
		expect(result).not.toContain('## Navigation')
		expect(result).toContain('## Documentation')
		expect(result).toMatchSnapshot()
	})

	it('generates llms.txt with domain in navigation links', async () => {
		const files = preparedFilesDepthSample({ srcDir })
		const chunks = organizeFilesByDepth(files, srcDir, 3, 2)
		const advancedChunk = chunks.find((c) => c.dirPath === 'guide/advanced')!

		const result = await generateDirectoryLLMsTxt(advancedChunk, {
			indexMd: `${srcDir}/index.md`,
			srcDir,
			domain: sampleDomain,
			templateVariables: {},
			includeNavigation: true,
		})

		expect(result).toContain(sampleDomain)
		expect(result).toContain(`${sampleDomain}/guide/llms.txt`)
		expect(result).toMatchSnapshot()
	})
})
