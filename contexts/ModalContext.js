// Dummy exports to prevent import errors
export const useModal = () => {
  console.warn('useModal is not implemented. Modal functionality is handled directly in components.');
  return {
    isModalOpen: false,
    openModal: () => {},
    closeModal: () => {}
  };
};

export const ModalProvider = ({ children }) => children;

export default null;
