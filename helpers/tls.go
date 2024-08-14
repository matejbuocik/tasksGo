// Generate a self-signed certificate.
//
// Go has builtin tool for this: `go run /usr/local/go/src/crypto/tls/generate_cert.go -ca -duration 3h -ecdsa-curve P256 -host localhost“
package helpers

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"log"
	"math/big"
	"os"
	"time"
)

func GenerateCert() {
	// Generate a key pair using the P-256 elliptic curve.
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		log.Fatalf("Failed to generate private key: %v", err)
	}

	// Create a random 128 bit serial number (should be unique) for the certificate.
	serialNumberLimit := new(big.Int).Lsh(big.NewInt(1), 128)
	serialNumber, err := rand.Int(rand.Reader, serialNumberLimit)
	if err != nil {
		log.Fatalf("Failed to generate serial number: %v", err)
	}

	// Create a certificate template.
	template := x509.Certificate{
		SerialNumber: serialNumber,
		Subject: pkix.Name{
			Organization: []string{"My Corp"},
		},
		DNSNames:  []string{"localhost"},
		NotBefore: time.Now(),
		NotAfter:  time.Now().Add(3 * time.Hour),

		KeyUsage:              x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}

	// Create the certificate.
	derBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, &privateKey.PublicKey, privateKey)
	if err != nil {
		log.Fatalf("Failed to create certificate: %v", err)
	}

	// Serialize the certificate into the file.
	pemCert := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: derBytes})
	if pemCert == nil {
		log.Fatal("Failed to encode certificate to PEM")
	}
	if err := os.WriteFile("cert.pem", pemCert, 0644); err != nil {
		log.Fatal(err)
	}
	log.Println("wrote cert.pem")

	// Serialize the private key into the file.
	privBytes, err := x509.MarshalPKCS8PrivateKey(privateKey)
	if err != nil {
		log.Fatalf("Unable to marshal private key: %v", err)
	}
	pemKey := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privBytes})
	if pemKey == nil {
		log.Fatal("Failed to encode key to PEM")
	}
	if err := os.WriteFile("key.pem", pemKey, 0600); err != nil {
		log.Fatal(err)
	}
	log.Println("wrote key.pem")
}
