// Artwork comes from the user's existing Skumic projects. These scenes are
// visual choices for this game, not claims about the artists' musical genres.
export const ARTISTS = [
  { id:'puppet', name:'SKUMIC', subtitle:'THE ORIGINAL MASCOT', scene:'THE MAIN STAGE', color:'#fa2d82', image:'assets/puppet.png', background:'stage', height:118 },
  { id:'gauthier', name:'GAUTHIER', subtitle:'STUDIO SESSIONS', scene:'THE RECORDING STUDIO', color:'#fa2d82', image:'assets/gauthier.png', background:'studio', height:126 },
  { id:'matar', name:'MATAR', subtitle:'LIVE & LOUD', scene:'THE LIVE STAGE', color:'#dcf105', image:'assets/matar.png', background:'stage', height:140 },
];
export const artistById = id => ARTISTS.find(a=>a.id===id) || ARTISTS[0];
