'use client';
import {BrandLogo} from '@/components/brand-logo';
import {useEffect,useState} from 'react';
import {ArrowRight,Star,Menu,X} from 'lucide-react';
import {productivityTools,superTools} from '@/lib/catalog';
export function SiteHeader({isSkills=false,isProductivityTools=false,isTools=false,experienceMode=false,favoriteOnly=false,favoritesCount,onFavorites}:{isSkills?:boolean;isProductivityTools?:boolean;isTools?:boolean;experienceMode?:boolean;favoriteOnly?:boolean;favoritesCount?:number;onFavorites?:()=>void}){
 const [menu,setMenu]=useState(false),[storedCount,setStoredCount]=useState(0);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('pws-favorites')||'[]');if(Array.isArray(saved))setStoredCount(saved.length)}catch{}},[]);

 return <header className="site-header"><div className="header-inner"><a href="/#library" className="brand" aria-label="PWS STUDIO 首页"><BrandLogo/></a><nav aria-label="主导航" className={menu?'main-nav is-open':'main-nav'}><a href="/#skills" className={isSkills?'active':''}>Skills</a><a href="/#productivity-tools" className={isProductivityTools?'active':''}>提效工具<span className="nav-badge">{productivityTools.length}</span></a><a href="/#super-tools" className={isTools?'active':''}>宝藏网站<span className="nav-badge">{superTools.length}</span></a><a href="/experience" className={experienceMode?'active':''} aria-current={experienceMode?'page':undefined} onClick={()=>setMenu(false)}>经验沉淀</a></nav><div className="header-actions"><a className="skill-upload-shortcut" href="/skills/upload">＋ 发布 Skill</a>{experienceMode?<a className="collection-button" href="/#library"><ArrowRight size={16}/>返回资源库</a>:<button className={`collection-button ${favoriteOnly?'is-active':''}`} onClick={()=>{if(onFavorites)onFavorites();else location.assign('/?favorites=1#library')}}><Star size={16}/>我的收藏<span>{favoritesCount??storedCount}</span></button>}<button className="icon-button menu-button" aria-label="切换导航" aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X size={20}/>:<Menu size={20}/>}</button></div></div></header>;
}
