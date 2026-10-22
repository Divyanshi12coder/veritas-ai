import { LinkButton } from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="container-x py-28 text-center">
      <p className="kicker">Error 404 · Correction</p>
      <h1 className="mt-3 text-5xl font-extrabold">This page was not found.</h1>
      <p className="mx-auto mt-4 max-w-md font-text text-lg text-charcoal/75">The article you were looking for has been moved, retracted or never existed.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <LinkButton to="/">Back to the front page</LinkButton>
        <LinkButton to="/analyze" variant="secondary">Analyze an article</LinkButton>
      </div>
    </div>
  );
}
