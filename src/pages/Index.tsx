import { MadeWithDyad } from "@/components/made-with-dyad";
import RaffleCouponGenerator from "@/components/RaffleCouponGenerator";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-3xl">
        <RaffleCouponGenerator />
      </div>
      <div className="mt-8">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;