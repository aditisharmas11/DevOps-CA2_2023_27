// You can run this in any main method to get a new key
import java.util.Base64;
import javax.crypto.KeyGenerator;
import java.security.NoSuchAlgorithmException;
import javax.crypto.SecretKey;

public class SecretKeyGenerator {
    public static void main(String[] args) throws NoSuchAlgorithmException {
        // Generate a 256-bit key for HS256
        KeyGenerator keyGen = KeyGenerator.getInstance("HmacSHA256");
        keyGen.init(256);
        SecretKey secretKey = keyGen.generateKey();

        // Get the key in byte array format
        byte[] keyBytes = secretKey.getEncoded();

        // Encode the byte array to a Base64 string
        String base64EncodedKey = Base64.getEncoder().encodeToString(keyBytes);

        System.out.println("Your new Base64 encoded JWT secret:");
        System.out.println(base64EncodedKey);
    }
}