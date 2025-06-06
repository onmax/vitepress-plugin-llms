<!-- markdownlint-capture -->
<!-- markdownlint-disable no-inline-html heading-start-left first-line-h1 -->
<div align="center">
  <b>Is this plugin useful for your site? Consider <a href="https://github.com/okineadev/vitepress-plugin-llms?sponsor">sponsoring the developer</a> to support the project's development 😺</b>
  <br><br>
  <a href="https://npmjs.com/package/vitepress-plugin-llms">
    <!-- https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#specifying-the-theme-an-image-is-shown-to -->
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/hero-dark.png">
      <source media="(prefers-color-scheme: light)" srcset="assets/hero-light.png">
      <img src="assets/hero-dark.png" alt="Banner">
    </picture>
  </a>

<!-- prettier-ignore-start -->
  # 📜 vitepress-plugin-llms

  [![NPM Downloads](https://img.shields.io/npm/dw/vitepress-plugin-llms?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiIHdpZHRoPSIyNHB4IiBmaWxsPSIjMDAwMDAwIj48cGF0aCBkPSJNNDgwLTMyMCAyODAtNTIwbDU2LTU4IDEwNCAxMDR2LTMyNmg4MHYzMjZsMTA0LTEwNCA1NiA1OC0yMDAgMjAwWk0xNjAtMTYwdi0yMDBoODB2MTIwaDQ4MHYtMTIwaDgwdjIwMEgxNjBaIi8%2BPC9zdmc%2B&labelColor=FAFAFA&color=212121)](https://www.npmjs.com/package/vitepress-plugin-llms) [![NPM Version](https://img.shields.io/npm/v/vitepress-plugin-llms?logo=npm&logoColor=212121&label=version&labelColor=FAFAFA&color=212121)](https://npmjs.com/package/vitepress-plugin-llms) [![Tests Status](https://img.shields.io/github/actions/workflow/status/okineadev/vitepress-plugin-llms/ci.yml?label=tests&labelColor=212121)](https://github.com/okineadev/vitepress-plugin-llms/actions/workflows/ci.yml) [![Built with Bun](https://img.shields.io/badge/Built_with-Bun-fbf0df?logo=bun&labelColor=212121)](https://bun.sh) [![Formatted with Biome](https://img.shields.io/badge/Formatted_with-Biome-60a5fa?style=flat&logo=biome&labelColor=212121)](https://biomejs.dev/) [![sponsor](https://img.shields.io/badge/sponsor-EA4AAA?logo=githubsponsors&labelColor=FAFAFA)](https://github.com/okineadev/vitepress-plugin-llms?sponsor=1)

  [🐛 Report bug](https://github.com/okineadev/vitepress-plugin-llms/issues/new?template=bug-report.yml) • [Request feature ✨](https://github.com/okineadev/vitepress-plugin-llms/issues/new?template=feature-request.yml)
</div>
<!-- markdownlint-restore -->

<!-- prettier-ignore-end -->

## 📦 Installation

```bash
npm install vitepress-plugin-llms --save-dev
```

## 🛠️ Usage

Add the Vite plugin to your VitePress configuration (`.vitepress/config.ts`):

```ts
import { defineConfig } from 'vitepress'
import llmstxt from 'vitepress-plugin-llms'

export default defineConfig({
  vite: {
    plugins: [llmstxt()]
  }
})
```

Now, thanks to this plugin, the LLM version of the website documentation is automatically generated

### Plugin Settings

See [`src/types.d.ts`](src/types.d.ts)

#### Example Configuration

Here is an example of how to configure the plugin with custom settings:

```ts
import { defineConfig } from 'vitepress'
import llmstxt from 'vitepress-plugin-llms'

export default defineConfig({
  vite: {
    plugins: [
      llmstxt({
        generateLLMsFullTxt: false,
        ignoreFiles: ['sponsors/*'],
        customLLMsTxtTemplate: `# {title}\n\n{foo}`,
        title: 'Awesome tool',
        customTemplateVariables: {
          foo: 'bar'
        }
      })
    ]
  }
})
```

This configuration does the following:

- `generateLLMsFullTxt: false`: Disables the generation of the `llms-full.txt` file.
- `ignoreFiles: ['sponsors/*']`: Ignores all files in the `sponsors` directory.
- `customLLMsTxtTemplate`: Uses a custom template for the `llms.txt` file.
- `title`: Sets a custom header in `llms.txt`, for your custom variables use `customTemplateVariables`.
- `customTemplateVariables`: Sets custom variables for the template, replaces `{foo}` with `bar`.

#### Depth-based Generation

You can now generate `llms.txt` files at different directory levels for better organization:

```ts
import { defineConfig } from 'vitepress'
import llmstxt from 'vitepress-plugin-llms'

export default defineConfig({
  vite: {
    plugins: [
      llmstxt({
        depth: 2,                    // Generate llms.txt for root + top-level directories
        minFilesPerChunk: 3,         // Only create llms.txt for directories with 3+ files
        includeNavigation: true,     // Include navigation links between related sections
      })
    ]
  }
})
```

With `depth: 2`, your file structure will look like:

```
.vitepress/dist/
├── llms.txt                    # Root overview with links to all sections
├── llms-full.txt               # Complete documentation (if enabled)
├── guide/
│   ├── llms.txt               # Guide-specific documentation with navigation
│   ├── getting-started.html
│   └── installation.html
├── api/
│   ├── llms.txt               # API-specific documentation with navigation
│   ├── components.html
│   └── plugins.html
└── examples/
    ├── llms.txt               # Examples-specific documentation with navigation
    ├── basic.html
    └── advanced.html
```

**Depth Options:**
- `depth: 1` (default): Only root `llms.txt`
- `depth: 2`: Root + top-level directories (e.g., `guide/llms.txt`, `api/llms.txt`)
- `depth: 3`: Root + two levels of nesting (e.g., `api/v2/llms.txt`)

**Navigation Features:**
Each directory-specific `llms.txt` includes navigation links to:
- **Parent**: Link to the parent directory's `llms.txt`
- **Siblings**: Links to other directories at the same level
- **Children**: Links to direct subdirectory `llms.txt` files

This follows the [llmstxt.org specification](https://llmstxt.org/) for optimal LLM consumption.

#### Embedding content specifically for LLMs with `<llm-only>` tag

You can add a content that will be visible in files for LLMs, but invisible to humans, this can be useful for setting special instructions like "Refer to #basic-queries for demonstrations", "NEVER do ....", "ALWAYS use ... in case of ..." etc.

To do this, you need to wrap content with the `<llm-only>` tag:

```markdown
<llm-only>

## Section for LLMs

This content appears only in the generated LLMs files without the `<llm-only>` tag
</llm-only>
```

Or

```markdown
Check out the Plugins API Guide for documentation about creating plugins.

<llm-only>Note for LLM...</llm-only>
```

#### Excluding content for LLMs with the `<llm-exclude>` tag

You can add a content that will be visible in files for humans, but invisible to LLMs, opposite of `<llm-only>`:

```markdown
<llm-exclude>
## Section for humans

This content will not be in the generated files for LLMs
</llm-exclude>
```

Or

```markdown
Check out the Plugins API Guide for documentation about creating plugins.

<llm-exclude>Note only for humans</llm-exclude>
```

## 🚀 Why `vitepress-plugin-llms`?

LLMs (Large Language Models) are great at processing text, but traditional documentation formats can be too heavy and cluttered. `vitepress-plugin-llms` generates raw Markdown documentation that LLMs can efficiently process

The file structure in `.vitepress/dist` folder will be as follows:

```plaintext
📂 .vitepress/dist
├── ...
├── llms-full.txt            // A file where all the website documentation is compiled into one file
├── llms.txt                 // The main file for LLMs with all links to all sections of the documentation for LLMs
├── markdown-examples.html   // A human-friendly version of `markdown-examples` section in HTML format
└── markdown-examples.md     // A LLM-friendly version of `markdown-examples` section in Markdown format
```

### ✅ Key Features

- ⚡️ Easy integration with VitePress
- ✅ Zero config required, everything works out of the box
- ⚙️ Customizable
- 🤖 An LLM-friendly version is generated for each page
- 📝 Generates `llms.txt` with section links
- 📖 Generates `llms-full.txt` with all content in one file
- 📁 Depth-based generation for hierarchical `llms.txt` files
- 🧭 Smart navigation between related documentation sections

## 📖 [llmstxt.org](https://llmstxt.org/) Standard

This plugin follows the [llmstxt.org](https://llmstxt.org/) standard, which defines the best practices for LLM-friendly documentation.

## ✨ Projects where this plugin is used

| Project                                                  |                                                                                   Stars                                                                                   |                      `llms.txt`                       |                         `llms-full.txt`                         |
| -------------------------------------------------------- | :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------: | :-------------------------------------------------------------: |
| [**Vite**](https://vitejs.dev/)                          |           [![Stars](https://img.shields.io/github/stars/vitejs/vite?style=flat&label=%E2%AD%90&labelColor=FAFAFA&color=212121)](https://github.com/vitejs/vite)           |         [llms.txt](https://vite.dev/llms.txt)         |         [llms-full.txt](https://vite.dev/llms-full.txt)         |
| [**Vue.js**](https://vuejs.org/)                         |            [![Stars](https://img.shields.io/github/stars/vuejs/core?style=flat&label=%E2%AD%90&labelColor=FAFAFA&color=212121)](https://github.com/vuejs/core)            |        [llms.txt](https://vuejs.org/llms.txt)         |        [llms-full.txt](https://vuejs.org/llms-full.txt)         |
| [**Slidev**](https://sli.dev/)                           |       [![Stars](https://img.shields.io/github/stars/slidevjs/slidev?style=flat&label=%E2%AD%90&labelColor=FAFAFA&color=212121)](https://github.com/slidevjs/slidev)       |         [llms.txt](https://sli.dev/llms.txt)          |         [llms-full.txt](https://sli.dev/llms-full.txt)          |
| [**Elysia**](https://elysiajs.com/)                      |       [![Stars](https://img.shields.io/github/stars/elysiajs/elysia?style=flat&label=%E2%AD%90&labelColor=FAFAFA&color=212121)](https://github.com/elysiajs/elysia)       |       [llms.txt](https://elysiajs.com/llms.txt)       |       [llms-full.txt](https://elysiajs.com/llms-full.txt)       |
| [**Rolldown**](https://rolldown.rs/)                     |     [![Stars](https://img.shields.io/github/stars/rolldown/rolldown?style=flat&label=%E2%AD%90&labelColor=FAFAFA&color=212121)](https://github.com/rolldown/rolldown)     |       [llms.txt](https://rolldown.rs/llms.txt)        |       [llms-full.txt](https://rolldown.rs/llms-full.txt)        |
| [**shadcn/vue**](https://shadcn-vue.com/)                |     [![Stars](https://img.shields.io/github/stars/unovue/shadcn-vue?style=flat&label=%E2%AD%90&labelColor=FAFAFA&color=212121)](https://github.com/unovue/shadcn-vue)     |      [llms.txt](https://shadcn-vue.com/llms.txt)      |      [llms-full.txt](https://shadcn-vue.com/llms-full.txt)      |
| [**Fantastic-admin**](https://fantastic-admin.hurui.me/) | [![Stars](https://img.shields.io/github/stars/fantastic-admin/basic?style=flat&label=%E2%AD%90&labelColor=FAFAFA&color=212121)](https://github.com/fantastic-admin/basic) | [llms.txt](https://fantastic-admin.hurui.me/llms.txt) | [llms-full.txt](https://fantastic-admin.hurui.me/llms-full.txt) |
| [**Vue Macros**](https://vue-macros.dev/)                | [![Stars](https://img.shields.io/github/stars/vue-macros/vue-macros?style=flat&label=%E2%AD%90&labelColor=FAFAFA&color=212121)](https://github.com/vue-macros/vue-macros) |      [llms.txt](https://vue-macros.dev/llms.txt)      |      [llms-full.txt](https://vue-macros.dev/llms-full.txt)      |
| [**oRPC**](https://orpc.unnoq.com/)                      |            [![Stars](https://img.shields.io/github/stars/unnoq/orpc?style=flat&label=%E2%AD%90&labelColor=FAFAFA&color=212121)](https://github.com/unnoq/orpc)            |      [llms.txt](https://orpc.unnoq.com/llms.txt)      |      [llms-full.txt](https://orpc.unnoq.com/llms-full.txt)      |
| [**tsdown**](https://tsdown.dev/)                        |       [![Stars](https://img.shields.io/github/stars/rolldown/tsdown?style=flat&label=%E2%AD%90&labelColor=FAFAFA&color=212121)](https://github.com/rolldown/tsdown)       |        [llms.txt](https://tsdown.dev/llms.txt)        |        [llms-full.txt](https://tsdown.dev/llms-full.txt)        |
| [**GramIO**](https://gramio.dev/)                        |       [![Stars](https://img.shields.io/github/stars/gramiojs/gramio?style=flat&label=%E2%AD%90&labelColor=FAFAFA&color=212121)](https://github.com/gramiojs/gramio)       |        [llms.txt](https://gramio.dev/llms.txt)        |        [llms-full.txt](https://gramio.dev/llms-full.txt)        |

## ❤️ Support

If you like this project, consider supporting it by starring ⭐ it on GitHub, sharing it with your friends, or [buying me a coffee ☕](https://github.com/okineadev/vitepress-plugin-llms?sponsor=1)

## 🤝 Contributing

You can read the instructions for contributing here - [CONTRIBUTING.md](./CONTRIBUTING.md)

## 📜 License

[MIT License](./LICENSE) © 2025-present [Yurii Bogdan](https://github.com/okineadev)

## 👨‍🏭 Contributors

Thank you to everyone who helped with the project!

![Contributors](https://contributors-table.vercel.app/image?repo=okineadev/vitepress-plugin-llms&width=50&columns=15)
