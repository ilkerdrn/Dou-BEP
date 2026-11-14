/**
 * Revision-aware separation of duties for institutional exam approvals.
 * Never infer a historical editor when legacy records lack this field.
 * Existing owner restriction still applies to every revision.
 */
export function reviewerSeparationViolation(row,actorId){
 if(!row||typeof actorId!=='string'||!actorId)return null;
 if(row.owner_id===actorId)return 'owner';
 if(typeof row.last_editor_id==='string'&&row.last_editor_id===actorId)return 'revision_editor';
 return null;
}
