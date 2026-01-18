import { Component, onMount, onCleanup, createEffect, createSignal } from 'solid-js'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import Image from '@tiptap/extension-image'
import BubbleMenu from '@tiptap/extension-bubble-menu'
import { workspaceStore } from '../store/workspace'
import { API } from '../platform'
import { Bold, Italic, Link as LinkIcon, Heading1, Heading2 } from 'lucide-solid'

interface Props {
  content: string
  onUpdate: (content: string) => void
  editable?: boolean
}

export const TiptapEditor: Component<Props> = (props) => {
  let element!: HTMLDivElement
  let bubbleMenuElement!: HTMLDivElement
  let editor: Editor | undefined
  const [editorState, setEditorState] = createSignal(0)

  onMount(() => {
    if (!element) return

    editor = new Editor({
      element: element,
      editable: props.editable,
      extensions: [
        StarterKit,
        Markdown,
        Image.configure({ inline: true }),
        BubbleMenu.configure({
          element: bubbleMenuElement
        })
      ],
      content: props.content,
      onUpdate: ({ editor }) => {
        const markdown = (editor.storage as any).markdown.getMarkdown()
        props.onUpdate(markdown)
      },
      onTransaction: () => {
        setEditorState((s) => s + 1)
      },
      editorProps: {
        attributes: {
          class:
            'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[50vh] outline-none'
        },
        handleDrop: (view, event, _slice, moved) => {
          if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            const file = event.dataTransfer.files[0]
            if (file.type.startsWith('image/')) {
              event.preventDefault()
              const reader = new FileReader()
              reader.onload = async (e) => {
                const result = e.target?.result as string
                if (result && workspaceStore.state.currentPath) {
                  const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`
                  const assetsDir = `${workspaceStore.state.currentPath}/assets`
                  const absPath = `${assetsDir}/${filename}`

                  try {
                    try {
                      await API.cms.fs.mkdir(assetsDir)
                    } catch {}

                    await API.cms.fs.writeImage(absPath, result)
                    const { schema } = view.state
                    const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
                    const node = schema.nodes.image.create({ src: `file://${absPath}` })
                    const transaction = view.state.tr.insert(coordinates?.pos ?? 0, node)
                    view.dispatch(transaction)
                  } catch (err) {
                    console.error('Failed to save image', err)
                  }
                }
              }
              reader.readAsDataURL(file)
              return true
            }
          }
          return false
        }
      }
    })
  })

  createEffect(() => {
    if (editor && props.editable !== undefined) {
      editor.setEditable(props.editable)
    }
  })

  onCleanup(() => {
    editor?.destroy()
  })

  return (
    <div class="contents">
      <div
        ref={bubbleMenuElement}
        class="bubble-menu z-50 -ml-6 flex items-center gap-1 overflow-hidden rounded-lg border bg-white p-1 shadow-xl dark:border-[#2f2f2f] dark:bg-[#202020]"
      >
        {editorState() >= 0 && editor && (
          <>
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              class={`rounded p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-[#2C2C2C] ${editor.isActive('bold') ? "bg-gray-200 text-blue-600 dark:bg-[#3f3f3f]" : "text-gray-600 dark:text-[#9B9A97]"}`}
              data-testid="bold"
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              class={`rounded p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-[#2C2C2C] ${editor.isActive('italic') ? "bg-gray-200 text-blue-600 dark:bg-[#3f3f3f]" : "text-gray-600 dark:text-[#9B9A97]"}`}
            >
              <Italic size={16} />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              class={`rounded p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-[#2C2C2C] ${editor.isActive('heading', { level: 1 }) ? "bg-gray-200 text-blue-600 dark:bg-[#3f3f3f]" : "text-gray-600 dark:text-[#9B9A97]"}`}
            >
              <Heading1 size={16} />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              class={`rounded p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-[#2C2C2C] ${editor.isActive('heading', { level: 2 }) ? "bg-gray-200 text-blue-600 dark:bg-[#3f3f3f]" : "text-gray-600 dark:text-[#9B9A97]"}`}
            >
              <Heading2 size={16} />
            </button>
            <div class="mx-1 h-4 w-px bg-gray-200 dark:bg-[#2f2f2f]"></div>
            <button
              onClick={() => {
                const previousUrl = editor?.getAttributes('link').href
                const url = window.prompt('URL', previousUrl)
                if (url === null) return
                if (url === '') {
                  editor?.chain().focus().extendMarkRange('link').unsetLink().run()
                  return
                }
                editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
              }}
              class={`rounded p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-[#2C2C2C] ${editor.isActive('link') ? "bg-gray-200 text-blue-600 dark:bg-[#3f3f3f]" : "text-gray-600 dark:text-[#9B9A97]"}`}
            >
              <LinkIcon size={16} />
            </button>
          </>
        )}
      </div>
      <div ref={element} class="w-full flex-1" />
    </div>
  )
}
