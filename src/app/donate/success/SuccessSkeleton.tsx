export default function SuccessSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-6">
      <div className="py-6 flex justify-between items-center">
        <div className="h-8 w-36 bg-gray-200 rounded-lg animate-pulse" />
        <div className="flex gap-8 items-center">
          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-12 w-28 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-8 animate-pulse" />
        <div className="h-10 w-72 bg-gray-200 rounded-lg mx-auto mb-4 animate-pulse" />
        <div className="h-6 w-80 bg-gray-100 rounded mx-auto mb-2 animate-pulse" />
        <div className="h-5 w-48 bg-gray-100 rounded mx-auto mb-6 animate-pulse" />
        <div className="h-14 w-52 bg-gray-100 rounded-card mx-auto mb-10 animate-pulse" />
        <div className="flex gap-4 justify-center">
          <div className="h-12 w-44 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-12 w-44 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
