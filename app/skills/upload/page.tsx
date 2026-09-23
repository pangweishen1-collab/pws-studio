import type {Metadata} from 'next';
import UploadClient from './upload-client';
export const metadata:Metadata={title:'发布 Skill · 庞伟深',description:'上传 SKILL.md 和可选 ZIP 文件，发布到个人 Skill 资源库。'};
export default function UploadPage(){return <UploadClient/>}
