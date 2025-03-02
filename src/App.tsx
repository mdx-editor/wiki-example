import { $patchStyleText } from '@lexical/selection'
import { activeEditor$, Cell, createRootEditorSubscription$, currentSelection$, diffSourcePlugin, DiffSourceToggleWrapper, directivesPlugin, headingsPlugin, JsxEditorProps, jsxPlugin, linkDialogPlugin, linkPlugin, MDXEditor, realmPlugin, toolbarPlugin, useCellValue, useCellValues } from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import { $getRoot, $isTextNode, ElementNode, LexicalNode } from 'lexical'
import React, { FC } from 'react'
import { mdxEditorMentionsPlugin } from './mentions/mdxEditorMentionsPlugin'
import { mdxEditorEmojiPickerPlugin } from './emoji/mdxEditorEmojiPickerPlugin'
import * as Popover from '@radix-ui/react-popover'
import './popover-styles.css'
import { dummyMentionsData } from './usersToMention'

type TocHeading = { level: number, content: string }

// Make a stateful stream that updates itself when the Lexical editor content changes.
// We collect only the root level headings
const currentHeadings$ = Cell<TocHeading[]>([], (r) => {
  r.pub(createRootEditorSubscription$, (editor) => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot()
        const headings: TocHeading[] = []
        for (const node of root.getChildren()) {
          if (node.getType() === 'heading') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const headingNode = node as any
            headings.push({ level: parseInt(headingNode.getTag().at(1)), content: headingNode.getTextContent() })
          }
        }
        r.pub(currentHeadings$, headings)
      })
    })
  })
})

const markdownWithColors = `
<TOCEditor />

  # Hello World


foo
bar

  A paragraph with <span style="color: red">some red text <span style="color: blue">with some blue nesting.</span> in here.</span> in it.

## Second level heading
A [google](https://google.com) link.

something more

and :mention[petyo ivanov] here.
`

const TOCEditor: FC<JsxEditorProps> = () => {
  const headings = useCellValue(currentHeadings$)
  return <div>Foo <ul>{headings.map((heading) => <li>{heading.level} {heading.content}</li>)}</ul></div>
}

const ColorsToolbar = () => {
  const [currentSelection, activeEditor] = useCellValues(currentSelection$, activeEditor$)

  const currentColor = React.useMemo(() => {
    return (
      activeEditor?.getEditorState().read(() => {
        const selectedNodes = currentSelection?.getNodes() ?? []
        if (selectedNodes.length === 1) {
          let node: ElementNode | LexicalNode | null | undefined = selectedNodes[0]
          let style = ''
          while (!style && node && node !== $getRoot()) {
            if ($isTextNode(node)) {
              style = node.getStyle()
            }
            node = node.getParent()
          }
          return parseStyleString(style).color
        } else {
          return null
        }
      }) ?? null
    )
  }, [currentSelection, activeEditor])

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="IconButton" aria-label="Update dimensions">
          Color
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="PopoverContent" sideOffset={5}>
          <>
            {['blue', 'red', 'green', 'orange', null].map((color) => {
              return (
                <button
                  key={color}
                  style={{
                    border: currentColor === color ? '2px solid black' : '2px solid gray',
                    width: '20px',
                    height: '20px',
                    backgroundColor: color ?? 'transparent'
                  }}
                  onClick={() => {
                    if (activeEditor !== null && currentSelection !== null) {
                      activeEditor.update(() => {
                        $patchStyleText(currentSelection, { color })
                      })
                    }
                  }}
                ></button>
              )
            })}
          </>
          <Popover.Arrow className="PopoverArrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export default function App() {
  const [readOnly, setReadOnly] = React.useState(false)
  return (
    <div>
      <label>
        <input
          type="checkbox"
          onChange={(e) => {
            setReadOnly(e.target.checked)
          }}
        />{' '}
        Read only
      </label>
      <MDXEditor
        readOnly={readOnly}
        markdown={markdownWithColors}
        plugins={[
          linkPlugin(),
          mdxEditorMentionsPlugin({
            searchCallback: async (search) => {
              await new Promise((resolve) => setTimeout(resolve, 500))
              return dummyMentionsData.filter((mention) => mention.toLowerCase().includes(search.toLowerCase()))
            }
          }),
          mdxEditorEmojiPickerPlugin(),
          directivesPlugin(),
          linkDialogPlugin({
            onClickLinkCallback(url) {
              console.log(`${url} clicked from the dialog`)
            },
            onReadOnlyClickLinkCallback(e, _node, url) {
              e.preventDefault()
              console.log(`${url} clicked from the dialog in read-only mode`)
            }
          }),
          headingsPlugin(),
          diffSourcePlugin(),
          jsxPlugin({
            jsxComponentDescriptors: [
              {
                name: 'TOCEditor',
                props: [],
                Editor: TOCEditor,
                hasChildren: false,
                kind: 'flow',
                source: 'toc'
              }
            ]
          }),
          toolbarPlugin({
            toolbarContents: () => (
              <DiffSourceToggleWrapper SourceToolbar={<div>Source toolbar</div>}>
                <ColorsToolbar />
              </DiffSourceToggleWrapper>
            )
          }),
          (realmPlugin({ init: (realm) => realm.register(currentHeadings$) }))()
        ]}
        onChange={(md) => {
          console.log('change', md)
        }}
      />
    </div>
  )
}

function parseStyleString(styleString: string) {
  // Remove any leading/trailing spaces and semicolon
  styleString = styleString.trim().replace(/;$/, '')

  // Split into individual style declarations
  const declarations = styleString.split(';')

  // Create an object to store the parsed styles
  const styles: Record<string, string> = {}

  for (const declaration of declarations) {
    // Skip empty declarations
    if (!declaration.trim()) {
      continue
    }

    // Split each declaration into property and value
    const [property, value] = declaration.split(':').map((str) => str.trim())

    // Convert property from kebab-case to camelCase
    const camelProperty = property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

    // Store in the styles object
    styles[camelProperty] = value
  }

  return styles
}
