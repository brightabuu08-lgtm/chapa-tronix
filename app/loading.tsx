export default function Loading(){return <main className="container loading-page" aria-label="Loading" aria-busy="true">{[1,2,3,4].map(n=><div className="skeleton" key={n}/>)}</main>}
