import * as ImagePicker from 'expo-image-picker';

export type ClientPhoto = { uri: string; base64: string };

export async function chooseClientPhoto(): Promise<ClientPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Allow photo access in iPhone Settings to choose a profile image.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: true, quality: 0.65, base64: true,
  });
  if (result.canceled) return null;
  const photo = result.assets[0];
  if (!photo.base64) throw new Error('Unable to load this photo. Choose another image.');
  if (photo.base64.length > 6_990_508) throw new Error('Choose a photo smaller than 5 MB.');
  return { uri: photo.uri, base64: photo.base64 };
}
