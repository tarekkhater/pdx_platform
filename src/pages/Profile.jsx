import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal';
import PageHeader from '@/components/PageHeader';
import {
  ProfileHeader,
  ProfileFields,
  SecuritySection,
  fromProfile,
  toProfilePayload,
} from '@/components/profile/ProfileFields';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, updateAvatar } from '@/services/profile.service';

const Profile = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [photo, setPhoto] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [values, setValues] = useState(() => fromProfile(user || {}));
  const [saving, setSaving] = useState(false);

  // The signed-in user is already loaded by the auth provider; this keeps the
  // form in step if it is refreshed from elsewhere.
  useEffect(() => {
    if (user) {
      setValues(fromProfile(user));
      setPhoto(user.image || null);
    }
  }, [user]);

  const pickPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Shown immediately from the local file so the change is visible while
    // the upload is still in flight.
    setPhoto(URL.createObjectURL(file));

    const result = await updateAvatar(file);
    if (!result.ok) {
      toast({ title: t('profile.saveFailedTitle'), description: result.message, variant: 'destructive' });
      setPhoto(user?.image || null);
      return;
    }
    await refreshUser();
  };

  const setField = (id, value) => setValues((prev) => ({ ...prev, [id]: value }));

  const save = async () => {
    setSaving(true);
    const result = await updateProfile(toProfilePayload(values));
    setSaving(false);

    if (!result.ok) {
      toast({ title: t('profile.saveFailedTitle'), description: result.message, variant: 'destructive' });
      return;
    }

    await refreshUser();
    toast({ title: t('profile.savedTitle'), description: t('profile.savedDesc') });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-3 max-w-3xl"
      >
        <PageHeader title={t('profile.title')} />

        <ProfileHeader
          photo={photo}
          onPickPhoto={pickPhoto}
          name={`${values.firstName} ${values.lastName}`.trim()}
          email={values.email}
        />

        <ProfileFields values={values} onChange={setField} />

        <SecuritySection onChangePassword={() => setIsPasswordModalOpen(true)} />

        <div className="flex justify-end pt-1">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={save}
            disabled={saving}
            className="w-full sm:w-auto sm:min-w-[160px] h-10 px-6 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-70 text-black font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('profile.saveChanges')}
          </motion.button>
        </div>
      </motion.div>
      <ChangePasswordModal isOpen={isPasswordModalOpen} setIsOpen={setIsPasswordModalOpen} />
    </>
  );
};

export default Profile;
