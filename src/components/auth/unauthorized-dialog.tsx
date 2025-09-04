import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UnauthorizedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRedirect: () => void;
}

export const UnauthorizedDialog: React.FC<UnauthorizedDialogProps> = ({
  open,
  onOpenChange,
  onRedirect,
}) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!open) {
      setCountdown(5);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, onRedirect]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session Expired</DialogTitle>
          <DialogDescription>
            Session expired or Unauthorized access. Redirecting to login page in{" "}
            {countdown} seconds.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onRedirect}>Go to Login Now</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
