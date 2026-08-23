export type PersonId = string;

export type Skill = string;

export interface Person {
  readonly personId: PersonId;
  readonly skills: readonly Skill[];
}
