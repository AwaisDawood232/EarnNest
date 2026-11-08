// custom upload wins, then the Google photo, then empty (the UI shows initials)
export const avatarUrlOf = (u = {}) =>
  u.avatar ? `/uploads/avatars/${u.avatar}` : u.photoURL || "";