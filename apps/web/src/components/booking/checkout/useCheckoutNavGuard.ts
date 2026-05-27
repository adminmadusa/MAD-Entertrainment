import { useEffect, useState } from "react";

interface UseCheckoutNavGuardProps {
  isModal: boolean;
  onBack: () => void;
  onClose: () => void;
}

export function useCheckoutNavGuard({
  isModal,
  onBack,
  onClose,
}: UseCheckoutNavGuardProps) {
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveAction, setLeaveAction] = useState<"back" | "close">("close");
  const [shouldAllowNavigation, setShouldAllowNavigation] = useState(false);

  useEffect(() => {
    if (isModal || shouldAllowNavigation) return;

    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      setLeaveAction("back");
      setIsLeaveModalOpen(true);
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [shouldAllowNavigation, isModal]);

  const handleBackClick = () => {
    setLeaveAction("back");
    setIsLeaveModalOpen(true);
  };

  const handleCloseClick = () => {
    setLeaveAction("close");
    setIsLeaveModalOpen(true);
  };

  const handleConfirmLeave = () => {
    setShouldAllowNavigation(true);
    setIsLeaveModalOpen(false);
    setTimeout(() => {
      if (leaveAction === "back") {
        onBack();
      } else {
        onClose();
      }
    }, 0);
  };

  return {
    isLeaveModalOpen,
    setIsLeaveModalOpen,
    handleBackClick,
    handleCloseClick,
    handleConfirmLeave,
    allowNavigation: () => setShouldAllowNavigation(true),
  };
}
