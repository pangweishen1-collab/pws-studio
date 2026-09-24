import SiteClient from './site-client';
import {listSkillSummaries} from '@/lib/skill-store';
export default async function Home(){const initialSkills=await listSkillSummaries().catch(()=>null);return <SiteClient initialSkills={initialSkills}/> }
