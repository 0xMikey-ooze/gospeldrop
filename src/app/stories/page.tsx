"use client";

import { Navbar } from "@/components/Navbar";

const stories = [
  {
    name: "Sarah M.",
    location: "Austin, TX",
    quote: "I found a Bible on my doorstep when I was going through the hardest time of my life. It felt like a sign. I've been reading it every night since.",
    color: "bg-accent-lavender",
  },
  {
    name: "James K.",
    location: "Portland, OR",
    quote: "My kids were curious about the package. We started reading it together as a family. It opened up conversations we never had before.",
    color: "bg-[#E0FCFD]",
  },
  {
    name: "Maria L.",
    location: "Chicago, IL",
    quote: "I'm a donor. Knowing that a stranger somewhere received a message of hope because of my $15 — that's the best feeling in the world.",
    color: "bg-[#FFF4E0]",
  },
  {
    name: "David R.",
    location: "Nashville, TN",
    quote: "I was skeptical at first, but reading the note that came with it — knowing someone cared enough to send it anonymously — that moved me.",
    color: "bg-[#FFEBF0]",
  },
  {
    name: "Anonymous Donor",
    location: "Remote",
    quote: "I've sent 47 Bibles so far. I may never meet the people who receive them, but I pray for each one.",
    color: "bg-[#E6FFF2]",
  },
  {
    name: "Lisa W.",
    location: "Denver, CO",
    quote: "The reading guide that came with it was so thoughtful. It made the Bible feel approachable instead of intimidating.",
    color: "bg-accent-lavender",
  },
];

export default function StoriesPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 min-h-screen">
      <Navbar />
      <div className="py-16">
        <h1 className="text-4xl font-[800] mb-2">Stories</h1>
        <p className="text-text-sub font-semibold mb-12">Real impact from random acts of faith.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {stories.map((story, i) => (
            <div key={i} className={`${story.color} rounded-card p-8 hover:-translate-y-2 transition-transform`}>
              <p className="text-text-main text-lg leading-relaxed mb-6 italic">&ldquo;{story.quote}&rdquo;</p>
              <div>
                <p className="font-[800] text-text-main">{story.name}</p>
                <p className="text-text-sub text-sm font-semibold">{story.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
