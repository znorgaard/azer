export interface FieldSpec {
  /** Frontmatter property key. */
  readonly key: string;
  /** Default value written on creation: scalar `""` or list `[]`. */
  readonly default: string | readonly string[];
}

export interface TypeSchema {
  readonly azerType: string;
  /** Human label for commands, e.g. "NPC". */
  readonly label: string;
  /** Default folder the "New X" command files notes into. */
  readonly defaultFolder: string;
  /** Frontmatter fields excluding the `azer-type` discriminator. */
  readonly fields: readonly FieldSpec[];
  /** Starter Markdown body copied into new notes. */
  readonly bodyTemplate: string;
}
