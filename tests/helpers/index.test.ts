import { describe, expect, it, mock } from 'bun:test'

import { defaultLLMsTxtTemplate } from '../../src/constants'

import { mockedFs } from '../mocks/fs'

mockedFs.default.readFile.mockReturnValue(Promise.resolve(fakeIndexMd))

mock.module('node:fs/promises', () => mockedFs)

import {
	generateLLMsFullTxt,
	generateLLMsTxt,
	// @ts-ignore
} from '../../src/helpers'
import {
	fakeCustomLlmsTxtTemplate,
	fakeIndexMd,
	outDir,
	preparedFilesSample,
	sampleDomain,
	srcDir,
} from '../resources'

describe('generateLLMsTxt', () => {
	it('generates a `llms.txt` file', async () => {
		expect(
			await generateLLMsTxt(preparedFilesSample.slice(1), {
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
			await generateLLMsTxt(preparedFilesSample.slice(1), {
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
			await generateLLMsTxt(preparedFilesSample, {
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
			await generateLLMsTxt(preparedFilesSample, {
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
		expect(await generateLLMsFullTxt(preparedFilesSample.slice(1), { srcDir })).toMatchSnapshot()
	})

	it('correctly attaches the domain to URLs in context', async () => {
		expect(
			await generateLLMsFullTxt(preparedFilesSample.slice(1), {
				srcDir,
				domain: sampleDomain,
			}),
		).toMatchSnapshot()
	})

	it('should filter files by directory correctly', async () => {
		const result = await generateLLMsFullTxt(preparedFilesSample, {
			srcDir,
			domain: sampleDomain,
			linksExtension: '.html',
			cleanUrls: false,
			directoryFilter: 'test',
		})

		// Should only include files from the test directory
		expect(result).toContain('Installation') // getting-started.md content
		expect(result).toContain('Project initialization') // quickstart.md content
		expect(result).not.toContain('Blazing fast frontend tool') // index.md description should not be included
	})

	it('should include all files when directoryFilter is root (.)', async () => {
		const result = await generateLLMsFullTxt(preparedFilesSample, {
			srcDir,
			domain: sampleDomain,
			linksExtension: '.html',
			cleanUrls: false,
			directoryFilter: '.',
		})

		// Should include all files
		expect(result).toContain('Installation')
		expect(result).toContain('Project initialization')
		expect(result).toContain('Blazing fast frontend tool')
	})

	it('should include all files when no directoryFilter is provided', async () => {
		const result = await generateLLMsFullTxt(preparedFilesSample, {
			srcDir,
			domain: sampleDomain,
			linksExtension: '.html',
			cleanUrls: false,
		})

		// Should include all files
		expect(result).toContain('Installation')
		expect(result).toContain('Project initialization')
		expect(result).toContain('Blazing fast frontend tool')
	})
})
