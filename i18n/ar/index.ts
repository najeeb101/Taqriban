import { admin } from './admin';
import { common } from './common';
import { game, categories } from './game';
import { social } from './social';

/** Merged Arabic string table: t.common.*, t.game.*, t.social.*, t.admin.* */
export const t = { common, game, social, admin };
export const categoryLabel = (slug: string) => categories[slug] ?? slug;
export type Strings = typeof t;
