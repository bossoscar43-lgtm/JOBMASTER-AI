import { handle, ok, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { getScoredJobs } from "@/lib/jobs/engine";

export async function GET(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const url = new URL(req.url);
    let jobs = getScoredJobs(user.id, 200);
    const q = url.searchParams.get("q")?.toLowerCase();
    const contract = url.searchParams.get("contract");
    const city = url.searchParams.get("city");
    const remote = url.searchParams.get("remote");
    const minScore = Number(url.searchParams.get("minScore") || 0);
    if (q) jobs = jobs.filter((j) => `${j.title} ${j.company} ${j.skills.join(" ")}`.toLowerCase().includes(q));
    if (contract) jobs = jobs.filter((j) => j.contract_type.toLowerCase().includes(contract.toLowerCase()));
    if (city) jobs = jobs.filter((j) => j.city.toLowerCase().includes(city.toLowerCase()));
    if (remote && remote !== "any") jobs = jobs.filter((j) => j.remote === remote);
    if (minScore) jobs = jobs.filter((j) => j.score >= minScore);
    return ok(jobs);
  });
}
