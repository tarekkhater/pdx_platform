import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import SubSheet from './SubSheet';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal';
import {
  ProfileHeader,
  ProfileFields,
  SecuritySection,
  fromProfile,
  toProfilePayload,
} from '@/components/profile/ProfileFields';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, updateAvatar } from '@/services/profile.service';

// Same fields and same layout as the /profile page — both render the shared
// components so the two entry points can never drift apart again.
const ProfilePanel = ({ isOpen, onBack, accountName }) => {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [photo, setPhoto] = useState(null);
  const [values, setValues] = useState(() => fromProfile(user || {}));
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setValues(fromProfile(user));
      setPhoto(user.image || null);
    }
  }, [user]);

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
    const result = await updateAvatar(file);
    if (!result.ok) {
      toast({ title: t('profile.saveFailedTitle'), description: result.message, variant: 'destructive' });
      setPhoto(user?.image || null);
      return;
    }
    await refreshUser();
  };

  const setField = (id, v) => setValues((prev) => ({ ...prev, [id]: v }));

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
    onBack();
  };

  return (
    <>
      <SubSheet isOpen={isOpen} onBack={onBack} title={t('settings.profile')}>
        <div className="space-y-3">
          <ProfileHeader
            photo={photo}
            onPickPhoto={pickPhoto}
            name={accountName}
            email={values.email}
          />

          <ProfileFields values={values} onChange={setField} />

          <SecuritySection onChangePassword={() => setIsPasswordOpen(true)} />

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={save}
            disabled={saving}
            className="w-full mt-2 h-11 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-70 text-black font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('profile.saveChanges')}
          </motion.button>
        </div>
      </SubSheet>
      <ChangePasswordModal isOpen={isPasswordOpen} setIsOpen={setIsPasswordOpen} />
    </>
  );
};

export default ProfilePanel;
