import { addComposerChild$, addExportVisitor$, addImportVisitor$, addLexicalNode$, Cell, LexicalExportVisitor, MdastImportVisitor, realmPlugin } from "@mdxeditor/editor";
import { TextDirective } from "mdast-util-directive";
import { $createMentionNode, $isMentionNode, MentionNode } from "./MentionNode";
import { ElementNode } from "lexical";
import * as Mdast from "mdast";
import NewMentionsPlugin from "./MentionsPlugin";

export const MdastMentionsVisitor: MdastImportVisitor<TextDirective> = {
  testNode: (node) => {
    return node.type === "textDirective" && node.name == 'mention'
  },
  visitNode: ({ mdastNode, lexicalParent }) => {
    // assume that we have a single text node inside the text directive
    const content = (mdastNode.children[0] as Mdast.Text).value
      ; (lexicalParent as ElementNode).append($createMentionNode(content))
  },
  // bump the priority of the visitor to ensure it goes before the generic directive one
  priority: 100
}

export const LexicalMentionsVisitor: LexicalExportVisitor<MentionNode, TextDirective> = {
  testLexicalNode: $isMentionNode,
  visitLexicalNode({ actions, lexicalNode, mdastParent }) {
    actions.appendToParent(mdastParent, {
      name: 'mention',
      type: 'textDirective',
      children: [
        { type: 'text', value: lexicalNode.getTextContent() }
      ]
    })
  },
  // bump the priority of the visitor to ensure it goes before the generic directive one
  priority: 100
}

export const userSearchCallback$ = Cell<(query: string) => Promise<string[]>>(() => Promise.resolve([]))

export const mdxEditorMentionsPlugin = realmPlugin<{ searchCallback: (query: string) => Promise<string[]> }>({
  init: (realm, params) => {
    realm.pubIn({
      [userSearchCallback$]: params?.searchCallback ?? [],
      [addLexicalNode$]: MentionNode,
      [addImportVisitor$]: MdastMentionsVisitor,
      [addExportVisitor$]: LexicalMentionsVisitor,
      [addComposerChild$]: NewMentionsPlugin
    })
  },
})
