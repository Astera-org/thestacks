export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarClass: string;
  role: string;
  you?: boolean;
  alsoContributor?: boolean;
  isTeam?: boolean;
}

export interface AccessState {
  visibility: "private" | "community";
  community: string;
  members: TeamMember[];
  shareLinkOn: boolean;
}
